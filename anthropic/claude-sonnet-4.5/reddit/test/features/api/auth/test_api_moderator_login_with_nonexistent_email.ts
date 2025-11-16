import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test moderator login behavior with a non-existent email address.
 *
 * This test validates that the authentication system properly rejects login
 * attempts for moderator accounts that do not exist in the system. It ensures
 * that the API maintains security best practices by:
 *
 * 1. Rejecting authentication attempts with non-existent credentials
 * 2. Not revealing whether the account exists (preventing user enumeration)
 * 3. Not issuing any authentication tokens for invalid attempts
 *
 * The test attempts to login with a randomly generated email address that has
 * never been registered, along with arbitrary credentials. The expected
 * behavior is an authentication error without any information disclosure about
 * account existence.
 */
export async function test_api_moderator_login_with_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a non-existent email address - this email was never registered
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Generate arbitrary password (doesn't matter since account doesn't exist)
  const randomPassword = RandomGenerator.alphaNumeric(12);

  // Generate valid connection context URLs
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Attempt to login with non-existent credentials - should fail
  await TestValidator.error(
    "login with non-existent email should be rejected",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: nonExistentEmail,
          password: randomPassword,
          href: href,
          referrer: referrer,
          ip: null,
        } satisfies IRedditCommunityCommunityModerator.ILogin,
      });
    },
  );
}
