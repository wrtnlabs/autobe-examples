import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test moderator registration email uniqueness constraint enforcement.
 *
 * This test validates that the moderator registration system properly enforces
 * email uniqueness constraints at the database level. It ensures that multiple
 * moderator accounts cannot be created with the same email address, maintaining
 * data integrity and preventing authentication credential conflicts.
 *
 * Test workflow:
 *
 * 1. Generate a unique email address for testing
 * 2. Create the first moderator account successfully with valid credentials
 * 3. Verify the first registration returns proper authentication tokens
 * 4. Attempt to register a second moderator with the same email
 * 5. Verify the duplicate registration is rejected by the system
 *
 * This ensures the database-level uniqueness constraint on moderator emails is
 * properly enforced, preventing duplicate accounts and maintaining system
 * security.
 */
export async function test_api_moderator_registration_email_uniqueness(
  connection: api.IConnection,
) {
  // Generate a random email address for testing uniqueness
  const testEmail = typia.random<string & tags.Format<"email">>();

  // Create the first moderator account with valid credentials
  const firstRegistrationBody = {
    email: testEmail,
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const firstModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: firstRegistrationBody,
    });

  // Validate the first registration succeeded
  typia.assert(firstModerator);

  // Verify the moderator data matches input
  TestValidator.equals(
    "first moderator email matches",
    firstModerator.email,
    testEmail,
  );
  TestValidator.equals(
    "first moderator nickname matches",
    firstModerator.nickname,
    firstRegistrationBody.nickname,
  );

  // Verify authentication tokens were issued
  typia.assert(firstModerator.token);
  TestValidator.predicate(
    "access token exists",
    firstModerator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    firstModerator.token.refresh.length > 0,
  );

  // Attempt to create a second moderator with the same email but different credentials
  const secondRegistrationBody = {
    email: testEmail, // Same email as first registration
    password: RandomGenerator.alphaNumeric(12), // Different password
    nickname: RandomGenerator.name(), // Different nickname
    ip: "192.168.1.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  // Verify that duplicate email registration fails
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: secondRegistrationBody,
      });
    },
  );
}
