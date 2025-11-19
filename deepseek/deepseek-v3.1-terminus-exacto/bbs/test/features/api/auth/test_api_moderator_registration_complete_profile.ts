import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration with complete profile information including all
 * optional fields.
 *
 * This test validates that the registration system properly handles and stores
 * all optional profile information when provided. The test creates a moderator
 * account with display_name, bio, and ip fields populated alongside required
 * fields. Validates that the returned moderator profile includes all provided
 * optional information and that the system maintains data integrity for
 * comprehensive moderator profiles.
 */
export async function test_api_moderator_registration_complete_profile(
  connection: api.IConnection,
) {
  // Generate complete moderator registration data with all optional fields
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(12),
    password: "SecurePassword123!",
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
    moderation_level: "senior",
    ip: "192.168.1.100",
    href: "https://discussionboard.example.com/register",
    referrer: "https://discussionboard.example.com",
  } satisfies IDiscussionBoardModerator.ICreate;

  // Register the moderator with complete profile information
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });

  // Validate the response structure and data integrity using typia.assert
  typia.assert(moderator);

  // Test that all provided fields are properly stored and returned (business logic validation)
  TestValidator.equals(
    "email should match registration data",
    moderator.email,
    registrationData.email,
  );
  TestValidator.equals(
    "username should match registration data",
    moderator.username,
    registrationData.username,
  );
  TestValidator.equals(
    "display_name should match provided value",
    moderator.display_name,
    registrationData.display_name,
  );
  TestValidator.equals(
    "bio should match provided content",
    moderator.bio,
    registrationData.bio,
  );
  TestValidator.equals(
    "moderation_level should match provided value",
    moderator.moderation_level,
    registrationData.moderation_level,
  );

  // Test that authentication tokens are properly generated (business functionality)
  TestValidator.predicate(
    "access token should be generated",
    moderator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be generated",
    moderator.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration should be set correctly",
    new Date(moderator.token.expired_at) > new Date(),
  );

  // Test that account creation timestamps are properly set (business workflow validation)
  TestValidator.predicate(
    "account should have creation timestamp",
    moderator.created_at !== undefined,
  );
  TestValidator.predicate(
    "account should have update timestamp",
    moderator.updated_at !== undefined,
  );
}
