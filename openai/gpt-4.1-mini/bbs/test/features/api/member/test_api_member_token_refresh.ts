import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommon } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommon";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_token_refresh(
  connection: api.IConnection,
) {
  // 1. Register a new member user
  const email: string = typia.random<string & tags.Format<"email">>();
  const password = "password123";
  const nickname = RandomGenerator.name();

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
        nickname,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Use obtained refresh token to get new tokens
  const refreshToken = member.token.refresh;
  const refreshed: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ICommon.IRefreshTokenRequest,
    });
  typia.assert(refreshed);

  // 3. Validate that the new tokens are different and valid
  TestValidator.predicate(
    "new access token is different",
    refreshed.token.access !== member.token.access,
  );
  TestValidator.predicate(
    "new refresh token is different",
    refreshed.token.refresh !== member.token.refresh,
  );
  TestValidator.predicate(
    "expired_at is valid ISO",
    typeof refreshed.token.expired_at === "string" &&
      refreshed.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO",
    typeof refreshed.token.refreshable_until === "string" &&
      refreshed.token.refreshable_until.length > 0,
  );
}
