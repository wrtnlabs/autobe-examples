import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // 1. Create a new member account using realistic email and password
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "super-secure-password";

  const memberAuthorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(memberAuthorized);

  // 2. Use the valid refresh token to renew access and refresh tokens
  const refreshed: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: memberAuthorized.token.refresh,
      } satisfies IDiscussionBoardMember.IRefresh,
    });

  typia.assert(refreshed);

  // 3. Validate the refreshed tokens are different and properly formed
  TestValidator.predicate(
    "Refresh token is string",
    typeof refreshed.token.refresh === "string",
  );
  TestValidator.predicate(
    "Access token is string",
    typeof refreshed.token.access === "string",
  );

  TestValidator.notEquals(
    "Access token has changed",
    refreshed.token.access,
    memberAuthorized.token.access,
  );
  TestValidator.notEquals(
    "Refresh token has changed",
    refreshed.token.refresh,
    memberAuthorized.token.refresh,
  );

  TestValidator.predicate(
    "Access token expiry string format",
    typeof refreshed.token.expired_at === "string" &&
      typeof memberAuthorized.token.expired_at === "string",
  );
  TestValidator.predicate(
    "Refresh token validity string format",
    typeof refreshed.token.refreshable_until === "string" &&
      typeof memberAuthorized.token.refreshable_until === "string",
  );
}
