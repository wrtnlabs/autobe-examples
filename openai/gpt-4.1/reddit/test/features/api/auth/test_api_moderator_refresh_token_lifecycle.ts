import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validate moderator JWT refresh token lifecycle.
 *
 * 1. Create a platform member with random email/password.
 * 2. Register the moderator account using the same email/password and a random
 *    community_id.
 * 3. Login with moderator credentials, ensuring both access and refresh tokens are
 *    issued and valid.
 * 4. Call the refresh endpoint with the valid refresh token, checking that a new
 *    set of tokens are returned and session persists.
 * 5. The new tokens must differ from the original access tokens but should remain
 *    structurally valid.
 * 6. An error is expected if refresh is attempted without a valid refresh
 *    token/session.
 */
export async function test_api_moderator_refresh_token_lifecycle(
  connection: api.IConnection,
) {
  // 1. Create platform member
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Register moderator for a random community
  const community_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email,
      password,
      community_id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);

  // 3. Login as moderator, capture tokens
  const login = await api.functional.auth.moderator.login(connection, {
    body: {
      email,
      password,
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  typia.assert(login);
  const firstAccess: string = login.token.access;
  const firstRefresh: string = login.token.refresh;

  // 4. Refresh tokens with valid refresh token
  const refreshed = await api.functional.auth.moderator.refresh(connection, {
    body: {} satisfies ICommunityPlatformModerator.IRefresh,
  });
  typia.assert(refreshed);
  const secondAccess: string = refreshed.token.access;
  const secondRefresh: string = refreshed.token.refresh;
  TestValidator.notEquals(
    "refresh returned new access token",
    secondAccess,
    firstAccess,
  );
  TestValidator.notEquals(
    "refresh returned new refresh token",
    secondRefresh,
    firstRefresh,
  );
  TestValidator.predicate(
    "new refresh token is non-empty",
    secondRefresh.length > 0,
  );
  TestValidator.predicate(
    "new access token is non-empty",
    secondAccess.length > 0,
  );

  // 5. Simulate error: try refresh with unauthenticated connection
  const unauthenticated: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("refresh without token should fail", async () => {
    await api.functional.auth.moderator.refresh(unauthenticated, {
      body: {} satisfies ICommunityPlatformModerator.IRefresh,
    });
  });
}
