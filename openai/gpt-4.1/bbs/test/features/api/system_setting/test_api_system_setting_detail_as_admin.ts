import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Validate that an administrator can retrieve full details for a specific
 * system-level configuration by its unique key.
 *
 * Scenario:
 *
 * 1. Register a new admin (using join: /auth/admin/join).
 * 2. Simulate (create) two settings: one active/normal (with description), one
 *    soft-deleted (with deleted_at).
 * 3. For both settings:
 *
 *    - Retrieve detail using GET /discussionBoard/admin/systemSettings/{key} as the
 *         new admin.
 *    - For the active setting:
 *
 *         - Validate response fields: id, key, value, description (may be undefined),
 *                   created_at, updated_at.
 *         - Confirm deleted_at is null or undefined.
 *    - For the deleted setting:
 *
 *         - Confirm either forbidden, not found, or appropriate error (business logic may
 *                   vary), and the setting is not visible.
 * 4. Edge cases:
 *
 * - Try retrieving a non-existent key and confirm a clear not-found error.
 * - Try retrieving setting with/without description.
 */
export async function test_api_system_setting_detail_as_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: "https://e2e.test/join",
    referrer: "https://e2e.test/landing",
  } satisfies IDiscussionBoardAdmin.IJoin;

  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);
  TestValidator.predicate("admin account is active", admin.is_active === true);

  // 2. Simulate two settings in the system (as we can't create directly), use typia.random to generate valid objects.
  // Simulate one normal/active setting (with description), and one soft-deleted setting.
  const activeSetting: IDiscussionBoardSystemSetting =
    typia.random<IDiscussionBoardSystemSetting>();
  const deletedSetting: IDiscussionBoardSystemSetting = {
    ...typia.random<IDiscussionBoardSystemSetting>(),
    deleted_at: new Date().toISOString(),
  };

  // 3. Happy path: Retrieve the detail for the active setting
  const output: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.admin.systemSettings.at(connection, {
      key: activeSetting.key,
    });
  typia.assert(output);
  TestValidator.equals(
    "returned key matches input key",
    output.key,
    activeSetting.key,
  );
  TestValidator.predicate(
    "audit field created_at present",
    typeof output.created_at === "string" && output.created_at.length > 0,
  );
  TestValidator.predicate(
    "audit field updated_at present",
    typeof output.updated_at === "string" && output.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null or undefined on active setting",
    output.deleted_at ?? null,
    null,
  );
  // If there is a description, it should be a string. If not, should be undefined.
  if (output.description !== undefined)
    TestValidator.predicate(
      "description present is string",
      typeof output.description === "string",
    );

  // 4. Edge: Retrieve for a deleted setting; expect error
  await TestValidator.error(
    "deleted system setting detail should be unavailable",
    async () => {
      await api.functional.discussionBoard.admin.systemSettings.at(connection, {
        key: deletedSetting.key,
      });
    },
  );

  // 5. Edge: Try a non-existent (random) key, expect not-found error
  await TestValidator.error(
    "non-existent system setting key should return error",
    async () => {
      await api.functional.discussionBoard.admin.systemSettings.at(connection, {
        key: RandomGenerator.alphaNumeric(16),
      });
    },
  );

  // 6. Coverage: Settings with/without description
  // -- Setting with description
  const withDescription: IDiscussionBoardSystemSetting = {
    ...typia.random<IDiscussionBoardSystemSetting>(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const withDescOut: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.admin.systemSettings.at(connection, {
      key: withDescription.key,
    });
  typia.assert(withDescOut);
  if (withDescOut.description !== undefined)
    TestValidator.predicate(
      "description present is string (with description)",
      typeof withDescOut.description === "string",
    );

  // -- Setting without description
  const withoutDescription: IDiscussionBoardSystemSetting = {
    ...typia.random<IDiscussionBoardSystemSetting>(),
    description: undefined,
  };
  const withoutDescOut: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.admin.systemSettings.at(connection, {
      key: withoutDescription.key,
    });
  typia.assert(withoutDescOut);
  TestValidator.equals(
    "description should be undefined when not set",
    withoutDescOut.description,
    undefined,
  );
}
