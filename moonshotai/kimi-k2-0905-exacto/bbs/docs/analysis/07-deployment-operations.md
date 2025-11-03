# politicsBbs - 정치/경제 토론 게시판
## 문서 목차 및 개요

### 📋 문서 개요

이 프로젝트는 간단한 정치/경제 토론 게시판 시스템을 구축하기 위한 완전한 문서 집합입니다. 모든 문서는 백엔드 개발자가 즉시 시스템을 구현할 수 있도록 상세한 비즈니스 요구사항을 제공합니다.

### 🎯 프로젝트 개요

**politicsBbs**는 정치와 경제에 대한 토론을 위한 간단한 게시판 서비스입니다. 사용자들은 기사를 작성하고, 댓글을 달며, 이미지와 파일을 첨부할 수 있습니다. 시스템은 복잡한 기능 없이 핵심적인 토론 기능에 집중합니다.

### 📚 문서 구조

#### 1. 서비스 개요 문서
- **[01-service-overview.md](./01-service-overview.md)** - 서비스 비전, 목표 사용자, 핵심 기능
- **[00-toc.md](./00-toc.md)** - 문서 목차 및 네비게이션 (현재 문서)

#### 2. 요구사항 명세서
- **[02-functional-requirements.md](./02-functional-requirements.md)** - 상세한 기능 요구사항
- **[03-user-actors.md](./03-user-actors.md)** - 사용자 역할 및 권한 정의
- **[05-business-rules.md](./05-business-rules.md)** - 비즈니스 규칙 및 제약사항
- **[06-technical-requirements.md](./06-technical-requirements.md)** - 기술적 요구사항

#### 3. 사용자 중심 설계
- **[04-user-scenarios.md](./04-user-scenarios.md)** - 사용자 시나리오 및 상호작용 흐름

#### 4. 운영 가이드
- **[07-deployment-operations.md](./07-deployment-operations.md)** - 배포 및 운영 절차

### 🚀 빠른 시작 가이드

#### 신규 개발자를 위한 순서:
1. **[01-service-overview.md](./01-service-overview.md)** - 서비스 이해
2. **[02-functional-requirements.md](./02-functional-requirements.md)** - 기능 파악
3. **[03-user-actors.md](./03-user-actors.md)** - 사용자 관점 이해
4. **[05-business-rules.md](./05-business-rules.md)** - 비즈니스 규칙 확인
5. **[06-technical-requirements.md](./06-technical-requirements.md)** - 기술적 제약사항

#### 프로젝트 관리자를 위한 순서:
1. **[01-service-overview.md](./01-service-overview.md)** - 서비스 전반 이해
2. **[04-user-scenarios.md](./04-user-scenarios.md)** - 사용자 경험 파악
3. **[05-business-rules.md](./05-business-rules.md)** - 운영 규칙 확인

#### 개발 리더를 위한 순서:
전체 문서를 순차적으로 읽어나가되, 구현 시점에 맞추어 세부 문서 참고

### 👥 대상 독자

- **개발자**: 백엔드 개발을 담당하는 기술 팀
- **제품 관리자**: 서비스 기획 및 운영을 담당하는 팀
- **일반**: 서비스에 대해 전반적으로 이해하고 싶은 이해관계자

### 🔗 문서 간 관계

이들 문서는 서로 밀접하게 연결되어 있습니다:

- **서비스 개요** → **기능 요구사항** → **사용자 역할** → **사용자 시나리오** → **비즈니스 규칙** → **기술 요구사항** → **배포 운영**

각 문서는 이전 문서의 정보를 바탕으로 더 구체적인 내용을 다룹니다.

### ⚠️ 개발자 노트

이 문서는 비즈니스 요구사항만을 정의합니다. 모든 기술적 구현사항(아키텍처, API 설계, 데이터베이스 구조 등)은 개발 팀의 재량에 맡깁니다.

이 문서들은 WHAT을 설명하며, HOW에 대한 결정은 개발자들의 몫입니다.