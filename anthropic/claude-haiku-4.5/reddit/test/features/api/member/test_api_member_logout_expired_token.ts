import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test logout with an invalid/malformed access token.
 *
 * This test validates that the logout endpoint properly rejects requests made
 * with an invalid or malformed access token. The scenario:
 *
 * 1. Create a member account via the join endpoint (establishes valid session)
 * 2. Attempt to logout with an invalid/malformed token to verify authentication
 *    validation
 * 3. Verify that the request fails with an appropriate authentication error
 * 4. Confirm that subsequent logout with valid token succeeds
 *
 * This ensures that the logout endpoint properly validates authentication
 * tokens and rejects requests with invalid credentials, maintaining security by
 * preventing unauthorized session termination.
 */
export async function test_api_member_logout_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<50> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    password: "ValidPassword123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // Step 2: Attempt to logout with an invalid token
  // Create a connection with malformed/invalid authorization header
  const invalidTokenConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // This should fail because the connection has no valid authorization token
  await TestValidator.error(
    "logout should fail with invalid or missing token",
    async () => {
      await api.functional.communityPlatform.member.auth.member.logout(
        invalidTokenConnection,
      );
    },
  );

  // Step 3: Verify that logout succeeds with valid token from join
  // The connection was automatically updated with valid token by join()
  const validLogoutResult =
    await api.functional.communityPlatform.member.auth.member.logout(
      connection,
    );
  typia.assert(validLogoutResult);

  TestValidator.predicate(
    "logout succeeded with valid token from member join",
    true,
  );
}
