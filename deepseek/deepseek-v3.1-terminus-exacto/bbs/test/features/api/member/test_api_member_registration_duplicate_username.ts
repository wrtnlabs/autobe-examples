import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member registration with duplicate username.
 *
 * This test validates that the system properly enforces unique usernames across
 * all member accounts. It first creates a member account with a specific
 * username to establish the uniqueness constraint, then attempts to register
 * another account with the same username. The second registration should fail
 * with an appropriate error response indicating username uniqueness constraint
 * violation.
 */
export async function test_api_member_registration_duplicate_username(
  connection: api.IConnection,
) {
  // Generate unique test data for the first registration
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphaNumeric(10);
  const password = "TestPassword123!";
  const displayName = RandomGenerator.name();
  const bio = RandomGenerator.paragraph({ sentences: 3 });

  // Create the first member account
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      email: firstEmail,
      username: username,
      password: password,
      display_name: displayName,
      bio: bio,
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(firstMember);

  // Validate that the first registration was successful
  TestValidator.equals(
    "first registration should return the created member",
    firstMember.email,
    firstEmail,
  );
  TestValidator.equals(
    "first registration should return the provided username",
    firstMember.username,
    username,
  );
  TestValidator.equals(
    "first registration should return the provided display name",
    firstMember.display_name,
    displayName,
  );
  TestValidator.equals(
    "first registration should return the provided bio",
    firstMember.bio,
    bio,
  );

  // Generate unique email for the second registration attempt
  const secondEmail = typia.random<string & tags.Format<"email">>();

  // Attempt to register a second account with the same username
  await TestValidator.error(
    "second registration with duplicate username should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: secondEmail,
          username: username, // Same username as first registration
          password: "DifferentPassword456!",
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
          href: "https://example.com/registration",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardMember.ICreate,
      });
    },
  );
}
