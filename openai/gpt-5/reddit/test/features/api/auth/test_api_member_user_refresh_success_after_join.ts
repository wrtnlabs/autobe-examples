import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

export async function test_api_member_user_refresh_success_after_join(
  connection: api.IConnection,
) {
  /**
   * Validate that a newly joined member user can refresh credentials using only
   * the refresh token, and that the refreshed authorization keeps the same
   * principal while rotating the access token.
   *
   * Steps
   *
   * 1. Join a new member user and capture the refresh token from the returned
   *    authorization bundle
   * 2. Create an unauthenticated connection and call refresh with the captured
   *    refresh token
   * 3. Validate that the refreshed authorization belongs to the same user and has
   *    a different access token
   * 4. Negative: Use an invalid refresh token to ensure refresh fails with proper
   *    business error handling
   */

  // 1) Join a new member user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = RandomGenerator.alphaNumeric(12); // matches ^[A-Za-z0-9_]{3,20}$
  const password: string = `${RandomGenerator.alphaNumeric(6)}A1!${RandomGenerator.alphaNumeric(4)}`; // >=8 chars, contains letter & digit
  const joinBody = {
    email,
    username,
    password,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: true,
  } satisfies ICommunityPlatformMemberUser.ICreate;

  const joined = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformMemberUser.IAuthorized>(joined);

  // Capture refresh token from join response
  const refreshToken: string = joined.token.refresh;

  // 2) Use an unauthenticated connection to prove no access token is required for refresh
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const refreshed = await api.functional.auth.memberUser.refresh(unauthConn, {
    body: {
      refresh_token: refreshToken,
    } satisfies ICommunityPlatformMemberUser.IRefresh,
  });
  typia.assert<ICommunityPlatformMemberUser.IAuthorized>(refreshed);

  // 3) Business validations
  TestValidator.equals(
    "refreshed principal id equals joined principal id",
    refreshed.id,
    joined.id,
  );

  TestValidator.notEquals(
    "access token must be rotated on refresh",
    refreshed.token.access,
    joined.token.access,
  );

  if (refreshed.username !== undefined && joined.username !== undefined) {
    TestValidator.equals(
      "username remains consistent across join and refresh",
      refreshed.username,
      joined.username,
    );
  }

  // 4) Negative: invalid refresh token should raise an error (business logic), with correct string type
  await TestValidator.error(
    "refresh with an invalid token should fail",
    async () => {
      await api.functional.auth.memberUser.refresh(unauthConn, {
        body: {
          refresh_token: "invalid.refresh.token",
        } satisfies ICommunityPlatformMemberUser.IRefresh,
      });
    },
  );
}
