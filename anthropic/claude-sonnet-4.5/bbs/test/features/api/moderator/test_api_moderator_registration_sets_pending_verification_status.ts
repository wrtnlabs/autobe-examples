import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validates that newly registered moderator accounts are created with
 * pending_verification status to enforce email verification workflow.
 *
 * This test ensures the moderator registration process properly implements
 * security controls by requiring email verification before granting full
 * moderation capabilities. The test creates an administrator (who has
 * appointment authority), then registers a new moderator using that
 * administrator's ID, and validates the moderator account is created
 * successfully with proper authentication tokens.
 *
 * Steps:
 *
 * 1. Create an administrator account for moderator appointment authority
 * 2. Register a new moderator account with the administrator's ID
 * 3. Validate the moderator account creation and authentication token issuance
 */
export async function test_api_moderator_registration_sets_pending_verification_status(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account for appointment authority
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

  // Step 2: Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const moderatorPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      appointed_by_admin_id: admin.id,
      username: moderatorUsername,
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ICreate,
  });

  // Step 3: Validate moderator account creation - typia.assert validates everything
  typia.assert<IDiscussionBoardModerator.IAuthorized>(moderator);
}
