# Music Is My Life (PWA) 🎵

오프라인 감성 음악 플레이어 **Music Is My Life**의 모바일(iOS / Android) & 데스크톱 PWA 버전입니다.
Apple 개발자 라이선스 및 7일 인증서 만료 없이, **영구 무료**로 아이폰에서 전체 화면 단독 앱으로 사용할 수 있습니다.

---

## ✨ 주요 기능
- **크림 & 라벤더 감성 카드 UI**: macOS 네이티브 앱과 동일한 부드러운 디자인
- **백그라운드 & 잠금화면 재생 (MediaSession API)**:
  - 화면을 끄거나 다른 앱(카카오톡, 웹서핑 등)을 실행해도 음악이 끊기지 않음
  - 잠금화면, 다이내믹 아일랜드, 제어센터, 에어팟 탭으로 재생/일시정지/이전곡/다음곡 제어 가능
- **오프라인 영구 저장 (IndexedDB)**:
  - 한 번 추가한 음원은 브라우저 로컬 저장소에 저장되어 비행기 모드나 데이터 없이도 재생
- **음악 추가 지원**:
  - 아이폰 '파일' 앱 / iCloud Drive에서 오디오(MP3, M4A, WAV 등) 파일 직접 추가
  - 유튜브 링크 / 검색 추가
  - 원클릭 추천 샘플 음악(Lofi) 불러오기
- **플레이어 기능**:
  - 이전 곡 순환 이동 (첫 번째 곡에서 이전 곡 누를 시 마지막 곡으로 자동 이동)
  - 셔플 및 반복 모드 (전체 반복 / 한 곡 반복 / 끄기)
  - 플레이리스트 생성 및 관리

---

## 🚀 Vercel 배포 방법

1. **GitHub 저장소 생성 및 푸시**:
   ```bash
   cd ~/Documents/music-is-my-life-pwa
   git remote add origin https://github.com/사용자계정/music-is-my-life-pwa.git
   git branch -M main
   git push -u origin main
   ```

2. **Vercel에서 배포**:
   - [Vercel](https://vercel.com) 로그인 ➔ **Add New...** ➔ **Project** 클릭
   - 방금 올린 `music-is-my-life-pwa` 레포지토리 선택 후 **Deploy** 클릭!
   - 1분 안에 `https://music-is-my-life-pwa.vercel.app` 과 같은 무료 HTTPS 주소가 생성됩니다.

---

## 📱 아이폰에 앱으로 설치하는 방법

1. 생성된 Vercel 주소를 **아이폰 Safari 브라우저**로 접속합니다.
2. Safari 화면 하단의 **공유 버튼 (⎋)**을 누릅니다.
3. 스크롤을 살짝 내려 **[홈 화면에 추가]**를 터치합니다.
4. 홈 화면에 예쁜 앱 아이콘이 생성되며, 실행하면 Safari 주소창 없이 **진짜 앱처럼 전체화면으로 실행**됩니다!
