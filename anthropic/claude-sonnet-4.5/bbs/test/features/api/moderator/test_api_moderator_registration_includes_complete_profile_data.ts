import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderator registration returns complete profile information in the
 * authorization response.
 *
 * This test validates the moderator registration flow which requires an
 * appointing administrator. The test ensures that when a moderator account is
 * created, the response includes all necessary authentication and profile data
 * including the moderator's unique identifier and JWT tokens.
 *
 * Test Flow:
 *
 * 1. Create an administrator account to provide the appointed_by_admin_id
 *    reference
 * 2. Register a new moderator with valid credentials (username, email, password)
 * 3. Validate that the response contains complete moderator authorization data
 *    through typia.assert which performs comprehensive validation of:
 *
 *    - Moderator unique ID (UUID format)
 *    - JWT token structure with access token, refresh token, and expiration
 *         timestamps
 *    - All property types and format constraints
 */
export async function test_api_moderator_registration_includes_complete_profile_data(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account for moderator appointment
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const administrator: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Register a new moderator with the administrator's ID
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        appointed_by_admin_id: administrator.id,
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  // Step 3: Validate the complete moderator authorization response
  // typia.assert performs COMPLETE validation including:
  // - UUID format validation for moderator.id
  // - Token structure validation (access, refresh, expired_at, refreshable_until)
  // - Date-time format validation for timestamp fields
  // - All type constraints and format tags
  typia.assert(moderator);
}
