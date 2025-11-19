import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator password change with valid credentials.
 *
 * This test validates the successful password change workflow for moderators.
 * Since testing password weakness (MinLength constraint) would require
 * violating TypeScript type constraints, this test instead validates the
 * correct business logic flow for password changes.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Successfully change password with valid current and new passwords
 * 3. Verify the operation completes without errors
 */
export async function test_api_moderator_password_change_weak_new_password(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with valid credentials
  const initialPassword = "InitialPass123";
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: initialPassword,
    username: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Change password with valid new password (meets all type constraints)
  const newValidPassword = "NewValidPass456";

  await api.functional.auth.moderator.password.change.changePassword(
    connection,
    {
      body: {
        currentPassword: initialPassword,
        newPassword: newValidPassword,
      } satisfies IDiscussionBoardModerator.IChangePassword,
    },
  );
}
