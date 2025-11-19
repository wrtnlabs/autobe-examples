import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration with only the required fields, omitting optional
 * profile information. This scenario validates that registration succeeds when
 * providing only the mandatory fields (email, username, password, moderation
 * level, href, referrer) while optional fields (display_name, bio, ip) are
 * omitted. The test creates a moderator account with minimal information and
 * validates that the system properly handles null values for optional fields
 * while returning complete authentication tokens and default profile
 * structure.
 */
export async function test_api_moderator_registration_minimal_fields(
  connection: api.IConnection,
) {
  // Generate random but realistic test data for required fields
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphaNumeric(8); // Fixed: Use alphaNumeric instead of alphabets
  const password = RandomGenerator.alphaNumeric(12);
  const moderation_level = RandomGenerator.pick([
    "basic",
    "senior",
    "admin",
  ] as const);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Create moderator registration request body with only required fields
  const requestBody = {
    email: email,
    username: username,
    password: password,
    moderation_level: moderation_level,
    href: href,
    referrer: referrer,
    // Optional fields are intentionally omitted
  } satisfies IDiscussionBoardModerator.ICreate;

  // Call the moderator join API with minimal data
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: requestBody,
  });

  // Validate the response contains complete moderator profile with authentication tokens
  typia.assert(moderator); // This performs COMPLETE validation including UUID format, token structure, etc.

  // Verify that required fields match the input
  TestValidator.equals("email should match input", moderator.email, email);
  TestValidator.equals(
    "username should match input",
    moderator.username,
    username,
  );
  TestValidator.equals(
    "moderation level should match input",
    moderator.moderation_level,
    moderation_level,
  );

  // Verify that optional fields are properly handled as undefined in the response
  TestValidator.equals(
    "display_name should be undefined when omitted",
    moderator.display_name,
    undefined,
  );
  TestValidator.equals(
    "bio should be undefined when omitted",
    moderator.bio,
    undefined,
  );

  // Note: All other validations (UUID format, token properties, timestamps) are already handled by typia.assert()
  // No additional validation needed since typia.assert() performs COMPLETE AND PERFECT type validation
}
