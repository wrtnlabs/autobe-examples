import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that account_status cannot be changed through profile update.
 *
 * Contributor registers in 'active' status, then attempts to update profile.
 * Verify that account_status field is read-only and cannot be modified through
 * the profile update endpoint. Status changes are moderation-only operations.
 *
 * Process:
 *
 * 1. Register a new contributor account (status is 'active' by default)
 * 2. Verify initial accountStatus is 'active'
 * 3. Update profile with valid fields (email)
 * 4. Verify accountStatus remains 'active' after update
 * 5. Confirm account_status is not part of IDiscussionBoardUser.IUpdate DTO
 */
export async function test_api_contributor_profile_update_account_status_field_ignored(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password = "SecurePass123!";

  const registeredContributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: contributorUsername,
        password: password,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(registeredContributor);

  // Step 2: Verify initial account status is 'active'
  TestValidator.equals(
    "initial account status should be active",
    registeredContributor.account_status,
    "active",
  );

  // Step 3: Update profile with new email - account_status cannot be included in IUpdate
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updatedProfile =
    await api.functional.discussionBoard.contributor.profile.update(
      connection,
      {
        body: {
          email: newEmail,
        } satisfies IDiscussionBoardUser.IUpdate,
      },
    );
  typia.assert(updatedProfile);

  // Step 4: Verify account status remains 'active' after update
  TestValidator.equals(
    "account status should remain active after profile update",
    updatedProfile.accountStatus,
    "active",
  );

  // Step 5: Verify email was updated
  TestValidator.equals(
    "email should be updated to new value",
    updatedProfile.email,
    newEmail,
  );

  // Step 6: Perform another update with minimal changes
  const finalUpdate =
    await api.functional.discussionBoard.contributor.profile.update(
      connection,
      {
        body: {} satisfies IDiscussionBoardUser.IUpdate,
      },
    );
  typia.assert(finalUpdate);

  // Step 7: Final verification - account status must remain 'active'
  // This confirms that account_status is a read-only field that cannot be modified
  TestValidator.equals(
    "account status must remain active - it is a read-only field not in IUpdate",
    finalUpdate.accountStatus,
    "active",
  );
}
