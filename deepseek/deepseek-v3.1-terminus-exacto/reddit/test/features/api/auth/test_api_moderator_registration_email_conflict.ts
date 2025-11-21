import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator registration failure when attempting to register with an email
 * address that already exists in the system.
 *
 * This test validates that the registration operation properly detects and
 * rejects duplicate email addresses, maintaining account uniqueness and
 * preventing unauthorized account creation.
 */
export async function test_api_moderator_registration_email_conflict(
  connection: api.IConnection,
) {
  // Generate a unique email address for testing
  const duplicateEmail = typia.random<string & tags.Format<"email">>();

  // Step 1: Create initial moderator account to cause email conflict
  const initialModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: duplicateEmail,
        display_name: RandomGenerator.name(),
        moderator_level: "community",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    },
  );
  typia.assert(initialModerator);

  // Validate that initial registration was successful
  TestValidator.equals(
    "initial moderator email matches",
    initialModerator.email,
    duplicateEmail,
  );
  TestValidator.predicate(
    "initial moderator should be active",
    initialModerator.is_active === true,
  );

  // Step 2: Attempt to register another moderator with the same email address
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      return await api.functional.auth.moderator.join(connection, {
        body: {
          email: duplicateEmail, // Same email as initial moderator
          display_name: RandomGenerator.name(),
          moderator_level: "global",
          is_active: false,
        } satisfies ICommunityPlatformModerator.ICreate,
      });
    },
  );
}
