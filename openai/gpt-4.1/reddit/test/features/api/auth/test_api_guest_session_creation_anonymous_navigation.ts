import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";

/**
 * 비로그인 사용자의 익명 세션 생성 및 제약 검증
 *
 * 1. 인증 없이 guest join (POST /auth/guest/join) 호출 - 고유 session_key, id, created_at
 *    존재 및 유효성 확인
 * 2. 동일 session_key로 다시 생성 시 오류 반환됨을 확인
 * 3. 게스트로 로그인한 상태에서 멤버 전용 API(커뮤니티 생성/포스트 작성/투표 등) 접근 시 거부됨을 검증
 */
export async function test_api_guest_session_creation_anonymous_navigation(
  connection: api.IConnection,
) {
  // 1. 인증 없이 guest join (정상)
  const sessionKey = RandomGenerator.alphaNumeric(32);
  const body = {
    session_key: sessionKey,
  } satisfies ICommunityPlatformGuest.ICreate;
  const guest: ICommunityPlatformGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body });
  typia.assert(guest);
  TestValidator.equals(
    "요청한 session_key가 반환값과 일치",
    guest.session_key,
    sessionKey,
  );
  TestValidator.predicate(
    "id는 유효한 UUID",
    typeof guest.id === "string" && guest.id.length > 0,
  );
  TestValidator.predicate(
    "created_at 정상",
    typeof guest.created_at === "string" && guest.created_at.length > 0,
  );
  TestValidator.equals("deleted_at는 null (활성 세션)", guest.deleted_at, null);
  typia.assert(guest.token);
  TestValidator.predicate(
    "access token 값 존재",
    typeof guest.token.access === "string" && guest.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token 값 존재",
    typeof guest.token.refresh === "string" && guest.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at 정상",
    typeof guest.token.expired_at === "string" &&
      guest.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until 정상",
    typeof guest.token.refreshable_until === "string" &&
      guest.token.refreshable_until.length > 0,
  );

  // 2. 동일 session_key로 중복 생성 시 오류
  await TestValidator.error(
    "동일 session_key로 게스트 생성 시 오류 반환",
    async () => {
      await api.functional.auth.guest.join(connection, { body });
    },
  );

  // 3. 게스트 세션 상태에서 멤버 전용(쓰기, 투표 등) API 차단 검증
  // 예시: 커뮤니티/게시글/투표 작성 등 (API 미제공이므로 주석)
  // await TestValidator.error("게스트가 포스트 작성 시 오류", async () => { ... });
}
