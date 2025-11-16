import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test member registration rejection when attempting to register with a
 * username already claimed by another member.
 *
 * This test validates that the system enforces username uniqueness through both
 * exact match and case-insensitive comparison. The test workflow:
 *
 * 1. Create an initial member account with a specific username
 * 2. Attempt to register a second member with the identical username (exact match)
 * 3. Attempt to register a third member with a case-different version of the
 *    existing username
 * 4. Verify all duplicate attempts are rejected with appropriate error response
 *
 * This ensures the username uniqueness constraint is properly enforced and
 * case-insensitive checking prevents users from claiming variations of existing
 * usernames.
 */
export async function test_api_member_registration_duplicate_username(
  connection: api.IConnection,
) {
  // Step 1: Create initial member account with a specific username
  const testUsername = RandomGenerator.alphabets(10);
  const firstMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: testUsername,
        password: "ValidPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(firstMember);

  // Step 2: Attempt to register with exact same username (should fail)
  await TestValidator.error(
    "duplicate username exact match should be rejected",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: testUsername,
          password: "AnotherPassword123!",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );

  // Step 3: Attempt to register with case-variation of existing username (should fail)
  const uppercaseUsername = testUsername.toUpperCase();
  await TestValidator.error(
    "duplicate username case-insensitive match should be rejected",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: uppercaseUsername,
          password: "ThirdPassword123!",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );

  // Step 4: Verify first member account was created successfully
  TestValidator.predicate(
    "first member account has valid ID after duplicate attempts",
    firstMember.id !== null && firstMember.id !== undefined,
  );
}
