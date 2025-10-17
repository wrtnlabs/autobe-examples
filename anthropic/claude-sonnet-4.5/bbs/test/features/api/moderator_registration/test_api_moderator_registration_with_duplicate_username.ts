import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration rejection when attempting to register with a
 * username that already exists.
 *
 * This test validates the unique username constraint enforcement in the
 * moderator registration system. The system must prevent duplicate usernames
 * even when different email addresses are provided.
 *
 * Test workflow:
 *
 * 1. Create an administrator account for moderator appointment authorization
 * 2. Register the first moderator with a specific username
 * 3. Attempt to register a second moderator with the same username but different
 *    email
 * 4. Validate that the system rejects the registration with an appropriate error
 */
export async function test_api_moderator_registration_with_duplicate_username(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for moderator appointment
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Register first moderator with a specific username
  const sharedUsername = RandomGenerator.alphaNumeric(10);
  const firstModeratorEmail = typia.random<string & tags.Format<"email">>();
  const firstModeratorPassword = RandomGenerator.alphaNumeric(12);

  const firstModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      appointed_by_admin_id: admin.id,
      username: sharedUsername,
      email: firstModeratorEmail,
      password: firstModeratorPassword,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(firstModerator);

  // Step 3: Attempt to register second moderator with same username but different email
  const secondModeratorEmail = typia.random<string & tags.Format<"email">>();
  const secondModeratorPassword = RandomGenerator.alphaNumeric(12);

  await TestValidator.error(
    "duplicate username should be rejected",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          appointed_by_admin_id: admin.id,
          username: sharedUsername,
          email: secondModeratorEmail,
          password: secondModeratorPassword,
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );
}
