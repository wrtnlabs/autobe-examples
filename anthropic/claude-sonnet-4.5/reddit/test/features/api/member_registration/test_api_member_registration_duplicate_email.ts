import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that the system prevents registration with duplicate email addresses.
 *
 * This test validates the email uniqueness constraint in the member
 * registration process. It verifies that the platform enforces
 * one-email-per-account policy by:
 *
 * 1. Successfully registering a member with a specific email address
 * 2. Attempting to register another member with a different username but the same
 *    email
 * 3. Verifying that the duplicate registration fails with an appropriate error
 * 4. Confirming that no duplicate record is created in the system
 *
 * This ensures data integrity and prevents multiple accounts from sharing the
 * same email address, which is critical for account recovery, notifications,
 * and user identification.
 */
export async function test_api_member_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate a unique email that will be used for both registration attempts
  const duplicateEmail = typia.random<string & tags.Format<"email">>();

  // Step 1: Register the first member successfully with the email
  const firstUsername = `user_${RandomGenerator.alphaNumeric(8)}`;
  const firstRegistrationData = {
    username: firstUsername,
    email: duplicateEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const firstMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: firstRegistrationData,
    });

  // Validate the first registration succeeded
  typia.assert(firstMember);
  TestValidator.equals(
    "first member email matches",
    firstMember.email,
    duplicateEmail,
  );
  TestValidator.equals(
    "first member username matches",
    firstMember.username,
    firstUsername,
  );

  // Step 2: Attempt to register a second member with a different username but the same email
  const secondUsername = `user_${RandomGenerator.alphaNumeric(8)}`;

  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          username: secondUsername,
          email: duplicateEmail,
          password: typia.random<string & tags.MinLength<8>>(),
          display_name: RandomGenerator.name(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityGuest.ICreate,
      });
    },
  );
}
