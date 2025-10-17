import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate refresh token session renewal for discussion board member.
 *
 * 1. Register a new member with unique random email, username, and password.
 * 2. Capture the returned access/refresh tokens.
 * 3. Use the refresh token to request session renewal via /auth/member/refresh.
 * 4. Confirm a new valid access token and that stable fields (id, email, username)
 *    are preserved.
 * 5. Error: Attempt refresh with a random/invalid token (should produce generic
 *    auth failure).
 * 6. Error: Attempt refresh with a clearly malformed/non-JWT string (should fail
 *    similarly).
 */
export async function test_api_member_refresh_token_workflow(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const registerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardMember.ICreate;
  const member = await api.functional.auth.member.join(connection, {
    body: registerInput,
  });
  typia.assert(member);

  // 2. Save returned tokens for refresh
  const initialToken = member.token;
  TestValidator.predicate(
    "refresh token exists",
    typeof initialToken.refresh === "string" && initialToken.refresh.length > 0,
  );

  // 3. Refresh session token
  const refreshBody = {
    refresh_token: initialToken.refresh,
  } satisfies IDiscussionBoardMember.IRefresh;
  const refreshed = await api.functional.auth.member.refresh(connection, {
    body: refreshBody,
  });
  typia.assert(refreshed);
  TestValidator.notEquals(
    "issued access token is updated after refresh",
    initialToken.access,
    refreshed.token.access,
  );
  TestValidator.equals(
    "member profile same after refresh",
    {
      id: refreshed.id,
      email: refreshed.email,
      username: refreshed.username,
      email_verified: refreshed.email_verified,
    },
    {
      id: member.id,
      email: member.email,
      username: member.username,
      email_verified: member.email_verified,
    },
  );

  // 4. Attempt refresh with a random/invalid token
  await TestValidator.error(
    "refresh fails with random token string",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(64),
        } satisfies IDiscussionBoardMember.IRefresh,
      });
    },
  );

  // 5. Attempt refresh with clearly malformed non-JWT value
  await TestValidator.error(
    "refresh fails with malformed token string",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: "not.a.jwt.token",
        } satisfies IDiscussionBoardMember.IRefresh,
      });
    },
  );
}
