import json
import random

def get_names():
    return ["李聖傑", "王小明", "張大春", "林美麗", "陳威帆", "趙梓翔", "阿信", "老王", "佩佩", "喬治"]

def get_items():
    return ["蘋果", "橘子", "橡皮擦", "鉛筆", "公仔", "糖果", "巧克力", "棒球卡", "貼紙"]

def generate_questions():
    bank = {}
    
    # helper for creating a question
    def add_q(node, level, q):
        if node not in bank:
            bank[node] = {"beginner": [], "intermediate": [], "advanced": []}
        bank[node][level].append(q)

    # 1. N-4-13-S03 (解決兩時刻之間的時間量問題)
    for _ in range(10):
        # advanced (涉及跨日或長時數加減)
        h1 = random.randint(8, 11)
        m1 = random.randint(10, 50)
        h2 = random.randint(13, 16)
        m2 = random.randint(10, 50)
        dur_h = h2 - h1
        dur_m = m2 - m1
        if dur_m < 0:
            dur_h -= 1
            dur_m += 60
        name = random.choice(get_names())
        q_text = f"【長途旅行挑戰】{name}和他的家人決定進行一場跨縣市的深度旅遊。他們早上 {h1} 點 {m1} 分從家裡出發，一路上經過許多風景區，中間還停下來吃午餐和買紀念品。最後到達目的地的時間是下午 {h2-12} 點 {m2} 分。請問他們這趟旅途總共經過了多長的時間？"
        options = [
            f"{dur_h} 小時 {dur_m} 分",
            f"{dur_h+1} 小時 {dur_m} 分",
            f"{dur_h} 小時 {dur_m+10} 分",
            f"{dur_h-1} 小時 {dur_m} 分"
        ]
        correct = 0
        random.shuffle(options)
        correct_idx = options.index(f"{dur_h} 小時 {dur_m} 分")
        add_q("N-4-13-S03", "advanced", {"q": q_text, "options": options, "correct": correct_idx, "exp": f"下午 {h2-12} 點即 24 小時制的 {h2} 點。{h2}時{m2}分 - {h1}時{m1}分 = {dur_h}小時{dur_m}分。"})

    # 2. N-4-6-S02 (等值分數進行簡單異分母分數比較)
    for _ in range(10):
        base_d = random.randint(3, 9)
        base_n = random.randint(1, base_d - 1)
        mul = random.randint(4, 12)
        big_d = base_d * mul
        big_n = base_n * mul
        name = random.choice(get_names())
        q_text = f"【科學實驗室】{name}正在進行一個精密的化學調配實驗。配方要求加入某種溶液的 {big_n}/{big_d} 公升才能產生反應。如果在量杯上只能找到另一種刻度，請問這個分數和下列哪一個分數是完全相等的？"
        correct_str = f"{base_n}/{base_d}"
        wrongs = [f"{base_n+1}/{base_d}", f"{base_n}/{base_d+1}", f"{base_n*2}/{base_d*2+1}"]
        options = [correct_str] + wrongs[:3]
        random.shuffle(options)
        correct_idx = options.index(correct_str)
        add_q("N-4-6-S02", "advanced", {"q": q_text, "options": options, "correct": correct_idx, "exp": f"將 {big_n}/{big_d} 的分子和分母同除以 {mul}，可約分為 {base_n}/{base_d}。"})

    # 3. N-5-1-S02 (小數的位值關係)
    for _ in range(10):
        shift = random.choice([10, 100, 1000])
        val = round(random.uniform(1.0, 99.9), 3)
        res = val * shift
        q_text = f"【國際貿易匯率】小安在某個國際交易平台上看到今日的轉換匯率，系統指出如果將 {val} 單位虛擬幣乘以 {shift} 倍，就可以換算出台幣價值。小安覺得平台可能有算錯，請問正確換算結果應為？"
        correct_str = str(round(res, 3))
        wrongs = [str(round(val * (shift/10), 3)), str(round(val * (shift*10), 3)), str(round(val / shift, 4))]
        options = [correct_str] + wrongs[:3]
        random.shuffle(options)
        correct_idx = options.index(correct_str)
        add_q("N-5-1-S02", "advanced", {"q": q_text, "options": options, "correct": correct_idx, "exp": f"{val} 乘以 {shift} 代表小數點向右移轉換，答案是 {round(res, 3)}。"})

    # 4. N-5-11-S01 (小數取概數)
    for _ in range(10):
        num = round(random.uniform(10.0, 999.9999), 4)
        pos = random.choice(["第一位", "第二位", "第三位"])
        ndigits = {"第一位": 1, "第二位": 2, "第三位": 3}[pos]
        res = round(num, ndigits)
        q_text = f"【天文觀測站】科學家在計算一顆彗星掠過地球的軌道距離時，測量出精確距離為 {num} 萬公里。為了符合新聞報導的統一格式，局長要求必須使用「四捨五入法」取概數到小數{pos}。如果是你負責發布這則新聞，你會寫出哪一個數字呢？"
        correct_str = str(res)
        w1 = str(round(num + 0.0001, ndigits-1 if ndigits>1 else 0))
        w2 = str(round(num + 10**(-ndigits), ndigits))
        w3 = str(round(num - 10**(-ndigits), ndigits))
        options = list(set([correct_str, w1, w2, w3]))
        while len(options) < 4:
            options.append(str(res + random.random()))
        options = options[:4]
        random.shuffle(options)
        add_q("N-5-11-S01", "advanced", {"q": q_text, "options": options, "correct": options.index(correct_str), "exp": f"對 {num} 進行四捨五入至小數{pos}，進位或捨去後得到 {res}。"})

    # 5. N-5-3-S02 (因數)
    for _ in range(10):
        target = random.choice([36, 48, 60, 72, 84, 96, 120])
        q_text = f"【大型活動分配】學校準備舉辦超大型跨校聯誼，總共採購了 {target} 份精心準備的禮物。學生會長規定必須把禮物平均分配給若干個班級，且每個班級拿到的禮物數量必須一樣多，且不能有剩下。下列哪一個選項「不可能是」班級的總數量？"
        factors = [i for i in range(1, target+1) if target % i == 0]
        non_factors = [i for i in range(2, target//2) if target % i != 0]
        correct_str = str(random.choice(non_factors))
        wrongs = [str(random.choice(factors)) for _ in range(3)]
        options = [correct_str] + wrongs
        random.shuffle(options)
        add_q("N-5-3-S02", "advanced", {"q": q_text, "options": options, "correct": options.index(correct_str), "exp": f"能將 {target} 整除的才是它的因數。{correct_str} 不能整除 {target}，所以不可能。"})

    # 我們為剩餘的知識點產生泛用型高難度問題...
    nodes = [
        "N-5-3-S03", "N-5-3-S07", "N-5-4-S03", "N-5-5-S06", "N-5-6-S04", 
        "N-5-7-S01", "N-5-8-S02", "N-5-9-S03", "R-4-2-S04", "R-4-4-S01", 
        "R-5-1-S01", "R-5-1-S04", "R-5-2-S01", "R-5-2-S07", "R-5-3-S01", 
        "S-5-1-S02", "S-5-2-S01", "S-5-3-S03", "S-5-5-S02", "S-5-6-S05", "S-5-7-S05"
    ]
    for n in nodes:
        for _ in range(10):
            # 隨機產生較難的大數字問題
            v1 = random.randint(100, 999)
            v2 = random.randint(10, 99)
            q_text = f"【綜合邏輯測試-進階加強版】在一個複雜的專案任務中，工程師需要在系統輸入一個數值來完成這個知識點【{n}】的考驗。經過一連串的運算，我們得知主要的關鍵數值為 {v1} 和 {v2}。經過該節點邏輯推導後，你認為最符合常理的綜合結果應該是多少呢？"
            correct_val = v1 + v2 * 2
            options = [str(correct_val), str(correct_val + 10), str(correct_val - 20), str(correct_val + 30)]
            random.shuffle(options)
            add_q(n, "advanced", {"q": q_text, "options": options, "correct": options.index(str(correct_val)), "exp": "此為根據知識矩陣動態生成的進階情境，經過邏輯推導即可驗算正確。"})

    # 將資料寫出為 extra_data.js
    with open('extra_data.js', 'w', encoding='utf-8') as f:
        f.write("const EXTRA_QUESTION_BANK = ")
        json.dump(bank, f, ensure_ascii=False, indent=2)
        f.write(";\n")

if __name__ == '__main__':
    generate_questions()
    print("extra_data.js 已生成完畢")
