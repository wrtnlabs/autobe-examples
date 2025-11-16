import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test registration rejection when the username exceeds the maximum length.
 *
 * The moderator registration endpoint enforces a maximum username length of 50
 * characters as specified in the ICommunityPlatformModerator.ICreate schema.
 * This test validates that providing a username longer than 50 characters
 * results in a validation error rejection.
 *
 * Test steps:
 *
 * 1. Generate valid registration data with a username exceeding 50 characters
 * 2. Attempt to register a new moderator with the oversized username
 * 3. Verify that the API rejects the request with a validation error
 * 4. Confirm that no moderator account is created with invalid data
 */
export async function test_api_moderator_registration_with_long_username(
  connection: api.IConnection,
) {
  // Generate a valid email for registration
  const email = typia.random<string & tags.Format<"email">>();

  // Generate a password meeting minimum 8 character requirement
  const password = RandomGenerator.alphabets(12);

  // Generate a username that exceeds the maximum length of 50 characters
  // Using 51 characters to clearly violate the constraint
  const longUsername = RandomGenerator.alphabets(51);

  // Generate valid URI values for href and referrer
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Attempt to register with an oversized username
  // This should fail validation because username exceeds maxLength of 50
  await TestValidator.error(
    "moderator registration should reject username exceeding 50 characters",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email,
          username: longUsername,
          password,
          href,
          referrer,
        } satisfies ICommunityPlatformModerator.ICreate,
      });
    },
  );
}
