import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Validates the complete admin update flow for a global system setting.
 *
 * 1. Register a new admin (unique email, strong password)
 * 2. Create a system setting (unique key, value, description)
 * 3. Update the system setting value and/or description as the admin
 * 4. Verify only allowed fields are updated: 'value'/'description' but not 'key'
 *    or audit fields
 * 5. Ensure non-admin/unauthenticated users cannot update
 */
export async function test_api_system_setting_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminHref = "https://admin-setup.test/join";
  const adminReferrer = "https://admin-setup.test/";
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12) + "A!9#",
        href: adminHref,
        referrer: adminReferrer,
        ip: undefined,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a system setting
  const uniqueKey = `autotest_${RandomGenerator.alphaNumeric(10)}`;
  const initialValue = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 2 });
  const setting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.admin.systemSettings.create(
      connection,
      {
        body: {
          key: uniqueKey,
          value: initialValue,
          description: initialDescription,
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(setting);
  TestValidator.equals("setting key matches", setting.key, uniqueKey);
  TestValidator.equals("setting value matches", setting.value, initialValue);
  TestValidator.equals(
    "setting description matches",
    setting.description,
    initialDescription,
  );

  // 3. Update value and description as admin
  const updatedValue = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updateResult: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.admin.systemSettings.update(
      connection,
      {
        key: uniqueKey,
        body: {
          value: updatedValue,
          description: updatedDescription,
        } satisfies IDiscussionBoardSystemSetting.IUpdate,
      },
    );
  typia.assert(updateResult);

  TestValidator.equals(
    "updated setting key preserved",
    updateResult.key,
    uniqueKey,
  );
  TestValidator.equals("value updated", updateResult.value, updatedValue);
  TestValidator.equals(
    "description updated",
    updateResult.description,
    updatedDescription,
  );
  TestValidator.equals(
    "id remains same after update",
    updateResult.id,
    setting.id,
  );
  TestValidator.equals(
    "created_at remains same after update",
    updateResult.created_at,
    setting.created_at,
  );
  TestValidator.notEquals(
    "updated_at is changed after update",
    updateResult.updated_at,
    setting.updated_at,
  );

  // 4. Update only one field (value only, preserve description)
  const valueOnly = RandomGenerator.paragraph({ sentences: 2 });
  const valueOnlyResult: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.admin.systemSettings.update(
      connection,
      {
        key: uniqueKey,
        body: {
          value: valueOnly,
        } satisfies IDiscussionBoardSystemSetting.IUpdate,
      },
    );
  typia.assert(valueOnlyResult);
  TestValidator.equals(
    "description is preserved when only value updated",
    valueOnlyResult.description,
    updatedDescription,
  );
  TestValidator.equals("value is updated", valueOnlyResult.value, valueOnly);

  // 5. Update only one field (set description to null)
  const descNullResult: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.admin.systemSettings.update(
      connection,
      {
        key: uniqueKey,
        body: {
          description: null,
        } satisfies IDiscussionBoardSystemSetting.IUpdate,
      },
    );
  typia.assert(descNullResult);
  TestValidator.equals(
    "description nulls as requested",
    descNullResult.description,
    null,
  );
  TestValidator.equals(
    "value preserved when only description updated",
    descNullResult.value,
    valueOnly,
  );

  // 6. Attempt update by unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated users cannot update system settings",
    async () => {
      await api.functional.discussionBoard.admin.systemSettings.update(
        unauthConn,
        {
          key: uniqueKey,
          body: {
            value: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardSystemSetting.IUpdate,
        },
      );
    },
  );
}
