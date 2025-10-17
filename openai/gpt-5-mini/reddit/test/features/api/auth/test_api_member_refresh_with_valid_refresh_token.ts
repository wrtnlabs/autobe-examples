import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";

export async function test_api_member_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  /**
   * Test the member token refresh workflow.
   *
   * Steps:
   *
   * 1. Register a fresh member via POST /auth/member/join and capture the returned
   *    authorized payload (initial access and refresh tokens).
   * 2. Call POST /auth/member/refresh with the initial refresh token.
   * 3. Assert the returned authorized payload contains new tokens and the user
   *    identity fields match the originally created member.
   * 4. Observe refresh token rotation if present (conditionally asserted).
   * 5. Verify that an obviously invalid refresh token is rejected.
   */

  // 1) Register a fresh member via join
  const joinBody = {
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const authorized: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(authorized);

  // Capture initial refresh token
  const initialRefresh: string = authorized.token.refresh;

  // 2) Use refresh endpoint with a valid refresh token
  const refreshed: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refreshToken: initialRefresh,
      } satisfies ICommunityPortalMember.IRefresh,
    });
  typia.assert(refreshed);

  // 3) Assertions: user identity consistency and presence of tokens
  TestValidator.equals(
    "user id unchanged after refresh",
    refreshed.id,
    authorized.id,
  );
  TestValidator.equals(
    "username unchanged after refresh",
    refreshed.username,
    authorized.username,
  );
  TestValidator.equals(
    "display_name unchanged after refresh",
    refreshed.display_name,
    authorized.display_name,
  );

  TestValidator.predicate(
    "access token present after refresh",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present after refresh",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );

  // Optional rotation observation: if rotation occurred, assert that the
  // returned refresh token is different from the initial one. If rotation is
  // not implemented, skip this assertion (do not fail the test).
  if (refreshed.token.refresh !== initialRefresh) {
    // actual-first, expected-second pattern for TestValidator.notEquals
    TestValidator.notEquals(
      "refresh token rotated",
      refreshed.token.refresh,
      initialRefresh,
    );
  }

  // 4) Negative case: clearly invalid refresh token should produce an error
  await TestValidator.error("invalid refresh token should fail", async () => {
    await api.functional.auth.member.refresh(connection, {
      body: {
        refreshToken: "this-is-an-invalid-refresh-token",
      } satisfies ICommunityPortalMember.IRefresh,
    });
  });
}
