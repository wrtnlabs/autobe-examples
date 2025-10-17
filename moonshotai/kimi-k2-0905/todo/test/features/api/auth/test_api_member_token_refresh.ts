import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import type { IMemberCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberCreate";
import type { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";
import type { ITokenRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITokenRefresh";

/**
 * Tests JWT token refresh flow by registering as a new member, extracting the
 * refresh token from the response, then using the refresh endpoint to obtain
 * new access tokens. Validates that refresh tokens extend session validity and
 * maintain authenticated access after the initial tokens might expire. This
 * focuses on scenario testing of extended session management rather than token
 * expiration details themselves.
 */
export async function test_api_member_token_refresh(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to obtain initial JWT tokens
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  // Store original tokens for comparison
  const originalToken = member.token;

  // Step 2: Verify initial token structure and data
  TestValidator.predicate("member has valid uuid ID", () => {
    try {
      typia.assert<string & tags.Format<"uuid">>(member.id);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.equals(
    "member email matches registration",
    member.email,
    email,
  );
  TestValidator.equals(
    "member role is correct",
    member.role,
    "member" as IETodoRole,
  );
  TestValidator.predicate("member has valid token structure", () => {
    return (
      originalToken.access.length > 0 &&
      originalToken.refresh.length > 0 &&
      originalToken.expired_at.length > 0 &&
      originalToken.refreshable_until.length > 0
    );
  });

  // Step 3: Use refresh token to obtain new access tokens
  const refreshed = await api.functional.auth.member.refresh(connection, {
    body: {
      refresh: originalToken.refresh,
    } satisfies ITokenRefresh.IRequest,
  });
  typia.assert(refreshed);

  // Step 4: Validate refreshed token structure and compare with original
  TestValidator.equals(
    "refreshed member has same ID as original",
    refreshed.id,
    member.id,
  );
  TestValidator.equals(
    "refreshed member has same email",
    refreshed.email,
    member.email,
  );
  TestValidator.equals(
    "refreshed member has same role",
    refreshed.role,
    member.role,
  );

  // Step 5: Validate token refresh functionality
  TestValidator.predicate(
    "refreshed access token is different from original",
    () => {
      return refreshed.token.access !== originalToken.access;
    },
  );
  TestValidator.predicate(
    "refreshed refresh token is different from original",
    () => {
      return refreshed.token.refresh !== originalToken.refresh;
    },
  );
  TestValidator.predicate("new expiration times are set", () => {
    return (
      refreshed.token.expired_at.length > 0 &&
      refreshed.token.refreshable_until.length > 0
    );
  });
  TestValidator.predicate("new expiration is different from original", () => {
    return refreshed.token.expired_at !== originalToken.expired_at;
  });

  // Validate the new token structure is complete
  typia.assert<IAuthorizationToken>(refreshed.token);

  // Step 6: Test multiple refresh cycles to ensure continuity
  const secondRefresh = await api.functional.auth.member.refresh(connection, {
    body: {
      refresh: refreshed.token.refresh,
    } satisfies ITokenRefresh.IRequest,
  });
  typia.assert(secondRefresh);

  TestValidator.equals(
    "second refresh maintains user identity",
    secondRefresh.id,
    member.id,
  );
  TestValidator.predicate("second refresh provides different tokens", () => {
    return (
      secondRefresh.token.access !== refreshed.token.access &&
      secondRefresh.token.refresh !== refreshed.token.refresh
    );
  });

  // Validate second refresh token structure
  typia.assert<IAuthorizationToken>(secondRefresh.token);

  // Step 7: Test error handling with invalid refresh tokens
  await TestValidator.error(
    "refresh endpoint rejects invalid token",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh: typia.random<string>(),
        } satisfies ITokenRefresh.IRequest,
      });
    },
  );
}
