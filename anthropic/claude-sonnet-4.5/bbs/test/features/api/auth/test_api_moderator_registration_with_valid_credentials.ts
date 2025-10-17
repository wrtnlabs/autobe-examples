import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration with valid credentials.
 *
 * This test validates the complete moderator account registration workflow.
 * First, an administrator account is created to provide the
 * appointed_by_admin_id reference required for moderator appointment. Then, a
 * moderator is registered with valid credentials meeting all business rules,
 * and the response is validated to ensure proper account creation and JWT token
 * generation.
 *
 * Steps:
 *
 * 1. Create an administrator account to obtain the appointed_by_admin_id
 * 2. Generate valid moderator registration credentials
 * 3. Register the moderator account
 * 4. Validate the response structure and JWT tokens
 */
export async function test_api_moderator_registration_with_valid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for appointed_by_admin_id reference
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);

  // Step 2: Generate valid moderator registration credentials
  const moderatorCredentials = {
    appointed_by_admin_id: admin.id,
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardModerator.ICreate;

  // Step 3: Register moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCredentials,
    });

  // Step 4: Validate response structure - typia.assert validates everything
  typia.assert(moderator);
}
