import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test logout with an invalid or malformed access token.
 *
 * This test validates that the logout endpoint properly validates token format
 * and rejects requests with invalid tokens. The test:
 *
 * 1. Creates a valid member account through the join operation
 * 2. Modifies the authorization token to an invalid format
 * 3. Attempts to call logout with the malformed token
 * 4. Verifies that an authentication error is returned
 * 5. Ensures the error doesn't leak token validation implementation details
 */
export async function test_api_member_logout_invalid_token_format(
  connection: api.IConnection,
) {
  // Step 1: Create a valid member account
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: "ValidPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a connection with invalid token format
  // Simulate a malformed token that doesn't match valid JWT format
  const invalidTokenConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: "Bearer invalid.malformed.token",
    },
  };

  // Step 3: Attempt to logout with invalid token and verify error
  await TestValidator.error(
    "logout should fail with invalid token format",
    async () => {
      await api.functional.communityPlatform.member.auth.member.logout(
        invalidTokenConnection,
      );
    },
  );

  // Step 4: Test with another invalid token format (corrupted structure)
  const corruptedTokenConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: "Bearer corrupted_token_string_without_dots",
    },
  };

  await TestValidator.error(
    "logout should fail with corrupted token",
    async () => {
      await api.functional.communityPlatform.member.auth.member.logout(
        corruptedTokenConnection,
      );
    },
  );

  // Step 5: Test with no Authorization header
  const noAuthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "logout should fail without authorization header",
    async () => {
      await api.functional.communityPlatform.member.auth.member.logout(
        noAuthConnection,
      );
    },
  );
}
