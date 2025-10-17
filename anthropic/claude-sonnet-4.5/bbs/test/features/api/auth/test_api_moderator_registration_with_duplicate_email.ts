import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration rejection when attempting to register with a
 * duplicate email.
 *
 * This test validates that the system properly enforces email uniqueness across
 * moderator accounts. The workflow follows these steps:
 *
 * 1. Create an administrator account to obtain appointment authority
 * 2. Register the first moderator with a specific email address
 * 3. Attempt to register a second moderator with a different username but the same
 *    email
 * 4. Verify that the system rejects the duplicate email registration with an
 *    appropriate error
 *
 * This ensures the platform maintains email uniqueness as a critical
 * authentication constraint.
 */
export async function test_api_moderator_registration_with_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account for moderator appointment authority
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert<IDiscussionBoardAdministrator.IAuthorized>(admin);

  // Step 2: Register the first moderator with a specific email address
  const sharedEmail = typia.random<string & tags.Format<"email">>();
  const firstModeratorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const firstModeratorPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const firstModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      appointed_by_admin_id: admin.id,
      username: firstModeratorUsername,
      email: sharedEmail,
      password: firstModeratorPassword,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert<IDiscussionBoardModerator.IAuthorized>(firstModerator);

  // Step 3: Attempt to register a second moderator with different username but same email
  const secondModeratorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const secondModeratorPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  // Step 4: Validate that the duplicate email registration is rejected
  await TestValidator.error("duplicate email should be rejected", async () => {
    await api.functional.auth.moderator.join(connection, {
      body: {
        appointed_by_admin_id: admin.id,
        username: secondModeratorUsername,
        email: sharedEmail,
        password: secondModeratorPassword,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  });
}
