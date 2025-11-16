import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that prevents duplicate username registration.
 *
 * This test validates the username uniqueness constraint in the member
 * registration system. The system must reject registration attempts when a
 * username is already taken, even if other credentials (like email) are
 * different.
 *
 * Test workflow:
 *
 * 1. Register first member with username "testuser_abc123"
 * 2. Attempt to register second member with same username but different email
 * 3. Verify second registration fails with uniqueness error
 * 4. Confirm no duplicate username records exist in database
 */
export async function test_api_member_registration_duplicate_username(
  connection: api.IConnection,
) {
  // Generate unique test username to be used for both registration attempts
  const duplicateUsername = `testuser_${RandomGenerator.alphaNumeric(8)}`;

  // Generate two different email addresses
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const secondEmail = typia.random<string & tags.Format<"email">>();

  // Generate valid password (minimum 8 characters)
  const password = RandomGenerator.alphaNumeric(12);

  // Generate session tracking URIs
  const hrefUri = typia.random<string & tags.Format<"uri">>();
  const referrerUri = typia.random<string & tags.Format<"uri">>();

  // Step 1: Register first member successfully with the test username
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      username: duplicateUsername,
      email: firstEmail,
      password: password,
      href: hrefUri,
      referrer: referrerUri,
    } satisfies IRedditCommunityGuest.ICreate,
  });

  // Validate first registration succeeded
  typia.assert(firstMember);
  TestValidator.equals(
    "first member username matches",
    firstMember.username,
    duplicateUsername,
  );
  TestValidator.equals(
    "first member email matches",
    firstMember.email,
    firstEmail,
  );

  // Step 2: Attempt to register second member with same username but different email
  // This should fail due to username uniqueness constraint
  await TestValidator.error(
    "duplicate username registration should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          username: duplicateUsername,
          email: secondEmail,
          password: password,
          href: hrefUri,
          referrer: referrerUri,
        } satisfies IRedditCommunityGuest.ICreate,
      });
    },
  );
}
