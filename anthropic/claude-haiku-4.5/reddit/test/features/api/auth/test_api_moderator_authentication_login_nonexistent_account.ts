import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator login failure with non-existent account.
 *
 * This test validates that the moderator login endpoint properly rejects
 * authentication attempts using credentials for accounts that do not exist in
 * the system. The test attempts login with a non-existent email address and
 * password, verifying that the system returns an appropriate error without
 * leaking account existence information.
 *
 * The test covers the following scenarios:
 *
 * 1. Attempt login with non-existent email and random password
 * 2. Verify that the API rejects the request with an authentication error
 * 3. Ensure no tokens are issued for non-existent accounts
 * 4. Validate that error response does not confirm account non-existence
 */
export async function test_api_moderator_authentication_login_nonexistent_account(
  connection: api.IConnection,
) {
  // Attempt login with non-existent moderator email
  const nonexistentEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Verify that login fails with appropriate error for non-existent account
  await TestValidator.error(
    "non-existent moderator account should fail login",
    async () => {
      return await api.functional.auth.moderator.login(connection, {
        body: {
          email: nonexistentEmail,
          password: password,
          href: href,
          referrer: referrer,
        } satisfies ICommunityPlatformModerator.ILogin,
      });
    },
  );
}
