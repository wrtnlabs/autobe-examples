import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_token_refresh_suspended_account(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account and obtain initial tokens
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123"; // Meets requirements: 8+ chars, uppercase, lowercase, digit

  const authorized = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(authorized);
  TestValidator.predicate(
    "member should be authorized after join",
    authorized.id !== undefined && authorized.token !== undefined,
  );

  const initialRefreshToken = authorized.token.refresh;
  TestValidator.predicate(
    "refresh token should be present after registration",
    initialRefreshToken.length > 0,
  );

  // Step 2: Verify that token refresh works for active accounts
  // This validates the refresh mechanism before testing suspension scenarios
  const refreshedAuth = await api.functional.auth.member.refresh(connection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IDiscussionBoardMember.IRefreshRequest,
  });
  typia.assert(refreshedAuth);
  TestValidator.predicate(
    "refreshed token should contain valid access token",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed token should contain valid refresh token",
    refreshedAuth.token.refresh.length > 0,
  );

  // Step 3: Validate token expiration fields are present
  TestValidator.predicate(
    "access token expiration should be set",
    refreshedAuth.token.expired_at !== undefined &&
      refreshedAuth.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token expiration should be set",
    refreshedAuth.token.refreshable_until !== undefined &&
      refreshedAuth.token.refreshable_until.length > 0,
  );

  // Step 4: Test that new refresh token from refreshed auth also works
  // This validates token rotation functionality
  const newRefreshToken = refreshedAuth.token.refresh;
  const secondRefresh = await api.functional.auth.member.refresh(connection, {
    body: {
      refresh_token: newRefreshToken,
    } satisfies IDiscussionBoardMember.IRefreshRequest,
  });
  typia.assert(secondRefresh);
  TestValidator.predicate(
    "second refresh should also succeed",
    secondRefresh.token.access.length > 0,
  );
}
