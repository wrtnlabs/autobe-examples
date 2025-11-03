import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsModerator";

/**
 * Test password update functionality with valid new password.
 *
 * Validates the basic password update flow for moderator accounts. Ensures the
 * password update endpoint properly accepts valid passwords and returns the
 * expected response structure with updated authentication tokens.
 *
 * 1. Create moderator account with initial password
 * 2. Update password with new valid password
 * 3. Verify API response structure and token updates
 * 4. Confirm password update operation completes successfully
 */
export async function test_api_moderator_password_update_invalid_current(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator account with valid initial password
  const moderatorPassword = typia.random<
    string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)..*">
  >();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9-]+$">
  >();
  const email = typia.random<
    string & tags.MinLength<6> & tags.MaxLength<254> & tags.Format<"email">
  >();

  const originalModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        username: username,
        email: email,
        password: moderatorPassword,
      } satisfies IPoliticsBbsModerator.ICreate,
    },
  );
  typia.assert(originalModerator);

  // Step 2: Generate new valid password for update
  const newPassword = typia.random<
    string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)..*">
  >();

  // Step 3: Update password with new valid password
  const updatedModerator =
    await api.functional.auth.moderator.password.updatePassword(connection, {
      body: {
        password: newPassword,
      } satisfies IPoliticsBbsModerator.IPassword,
    });

  // Step 4: Verify response structure and data integrity
  typia.assert(updatedModerator);

  // Verify moderator identity remains consistent
  TestValidator.equals(
    "moderator ID remains consistent",
    updatedModerator.id,
    originalModerator.id,
  );
  TestValidator.equals(
    "username unchanged",
    updatedModerator.username,
    originalModerator.username,
  );
  TestValidator.equals(
    "email unchanged",
    updatedModerator.email,
    originalModerator.email,
  );

  // Verify timestamps are valid
  TestValidator.predicate(
    "created_at is valid",
    updatedModerator.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid",
    updatedModerator.updated_at !== undefined,
  );

  // Verify token was updated during the password change
  typia.assert(updatedModerator.token);
  TestValidator.predicate(
    "access token is valid",
    updatedModerator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is valid",
    updatedModerator.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expiration",
    updatedModerator.token.expired_at !== undefined,
  );
}
