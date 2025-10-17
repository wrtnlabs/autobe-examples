import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration rejection when username violates format
 * constraints.
 *
 * This test validates that the moderator registration endpoint properly
 * enforces username format validation rules. According to the DTO
 * specification, usernames must be 3-30 characters long and contain only
 * alphanumeric characters with hyphens and underscores (pattern:
 * ^[a-zA-Z0-9_-]+$).
 *
 * Test workflow:
 *
 * 1. Create an administrator account for moderator appointment
 * 2. Attempt to register moderator with username too short (< 3 characters)
 * 3. Attempt to register moderator with username too long (> 30 characters)
 * 4. Attempt to register moderator with invalid special characters
 * 5. Attempt to register moderator with only special characters
 * 6. Verify all invalid attempts are rejected with appropriate errors
 */
export async function test_api_moderator_registration_with_invalid_username_format(
  connection: api.IConnection,
) {
  // Step 1: Create administrator for moderator appointment
  const adminData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Test username too short (less than 3 characters)
  await TestValidator.error(
    "username too short should be rejected",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          appointed_by_admin_id: admin.id,
          username: "ab",
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<
            string & tags.MinLength<8> & tags.MaxLength<128>
          >(),
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );

  // Step 3: Test username too long (more than 30 characters)
  await TestValidator.error(
    "username too long should be rejected",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          appointed_by_admin_id: admin.id,
          username: "a".repeat(31),
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<
            string & tags.MinLength<8> & tags.MaxLength<128>
          >(),
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );

  // Step 4: Test username with invalid special characters
  await TestValidator.error(
    "username with invalid special characters should be rejected",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          appointed_by_admin_id: admin.id,
          username: "user@name!",
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<
            string & tags.MinLength<8> & tags.MaxLength<128>
          >(),
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );

  // Step 5: Test username with only special characters
  await TestValidator.error(
    "username with only special characters should be rejected",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          appointed_by_admin_id: admin.id,
          username: "---___",
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<
            string & tags.MinLength<8> & tags.MaxLength<128>
          >(),
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );

  // Step 6: Test username with spaces (invalid)
  await TestValidator.error(
    "username with spaces should be rejected",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          appointed_by_admin_id: admin.id,
          username: "user name",
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<
            string & tags.MinLength<8> & tags.MaxLength<128>
          >(),
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );
}
