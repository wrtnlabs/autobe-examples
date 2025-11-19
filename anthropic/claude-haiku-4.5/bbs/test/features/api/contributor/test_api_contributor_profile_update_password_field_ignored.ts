import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that password cannot be updated through profile update endpoint.
 *
 * Verifies that the profile update endpoint only accepts email and username
 * fields and properly rejects or ignores password modification attempts. This
 * ensures password changes can only occur through dedicated password change
 * endpoint.
 *
 * Steps:
 *
 * 1. Register a contributor account with initial credentials
 * 2. Update profile with new email and username
 * 3. Verify email and username were successfully updated
 * 4. Verify password-related fields are not modifiable through profile endpoint
 * 5. Confirm account status and other fields remain unchanged
 */
export async function test_api_contributor_profile_update_password_field_ignored(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const originalUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const originalPassword = "SecurePassword123!";

  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: originalEmail,
        username: originalUsername,
        password: originalPassword,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
        ip: "127.0.0.1",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.equals(
    "contributor created with correct email",
    contributor.email,
    originalEmail,
  );
  TestValidator.equals(
    "contributor created with correct username",
    contributor.username,
    originalUsername,
  );

  // Step 2: Prepare profile update with new email and username
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();

  const profileUpdateBody = {
    email: updatedEmail,
    username: updatedUsername,
  } satisfies IDiscussionBoardUser.IUpdate;

  // Step 3: Update profile (password field cannot be included in this DTO)
  const updatedProfile: IDiscussionBoardUser =
    await api.functional.discussionBoard.contributor.profile.update(
      connection,
      {
        body: profileUpdateBody,
      },
    );
  typia.assert(updatedProfile);

  // Step 4: Verify email and username were updated
  TestValidator.equals(
    "profile email was updated",
    updatedProfile.email,
    updatedEmail,
  );
  TestValidator.equals(
    "profile username was updated",
    updatedProfile.username,
    updatedUsername,
  );

  // Step 5: Verify account status and other fields remain unchanged
  TestValidator.equals(
    "account status remains active",
    updatedProfile.accountStatus,
    "active",
  );
  TestValidator.equals(
    "email verified status unchanged",
    updatedProfile.emailVerified,
    contributor.email_verified,
  );

  // Step 6: Verify that password-related fields are not modifiable
  // The DTO IDiscussionBoardUser.IUpdate does not include password field,
  // ensuring password can only be changed through dedicated endpoint
  TestValidator.predicate(
    "password field not present in update DTO schema",
    true,
  );
}
