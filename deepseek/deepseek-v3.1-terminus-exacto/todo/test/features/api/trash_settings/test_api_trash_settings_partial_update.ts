import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTrashSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashSetting";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test partial updates to trash settings where only specific fields are modified
 * while others remain unchanged. Verify that the update operation correctly handles
 * partial request bodies and maintains existing values for fields not included in
 * the update request. Test that system-managed timestamps (created_at, updated_at)
 * are properly handled during partial updates.
 */
export async function test_api_trash_settings_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate user
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Retrieve the user's trash settings to get the settingId
  // The trash settings ID is different from the user ID
  const initialSettings = await api.functional.todoApp.user.trash.settings.at(
    userConnection,
    { settingId: user.id },
  );
  typia.assert(initialSettings);
  // Test 1: Partial update with only retention_period_days and auto_cleanup_enabled
  const partialUpdate1: ITodoAppTrashSetting.IUpdate = {
    retention_period_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    auto_cleanup_enabled: !initialSettings.auto_cleanup_enabled,
  };
  const updatedSettings1 =
    await api.functional.todoApp.user.trash.settings.update(userConnection, {
      settingId: initialSettings.id,
      body: partialUpdate1,
    });
  typia.assert(updatedSettings1);
  // Validate partial update 1
  TestValidator.equals(
    "retention_period_days should be updated",
    updatedSettings1.retention_period_days,
    partialUpdate1.retention_period_days,
  );
  TestValidator.equals(
    "auto_cleanup_enabled should be updated",
    updatedSettings1.auto_cleanup_enabled,
    partialUpdate1.auto_cleanup_enabled,
  );
  // Fields not included in update should remain unchanged
  TestValidator.equals(
    "notify_before_cleanup should remain unchanged",
    updatedSettings1.notify_before_cleanup,
    initialSettings.notify_before_cleanup,
  );
  TestValidator.equals(
    "notify_days_before should remain unchanged",
    updatedSettings1.notify_days_before,
    initialSettings.notify_days_before,
  );
  TestValidator.equals(
    "permanent_deletion_confirmation should remain unchanged",
    updatedSettings1.permanent_deletion_confirmation,
    initialSettings.permanent_deletion_confirmation,
  );
  // Timestamp validation
  TestValidator.predicate(
    "updated_at should be newer after update",
    new Date(updatedSettings1.updated_at) >
      new Date(initialSettings.updated_at),
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedSettings1.created_at,
    initialSettings.created_at,
  );
  // Test 2: Another partial update with different fields
  const partialUpdate2: ITodoAppTrashSetting.IUpdate = {
    notify_before_cleanup: !initialSettings.notify_before_cleanup,
    permanent_deletion_confirmation:
      !initialSettings.permanent_deletion_confirmation,
  };
  const updatedSettings2 =
    await api.functional.todoApp.user.trash.settings.update(userConnection, {
      settingId: initialSettings.id,
      body: partialUpdate2,
    });
  typia.assert(updatedSettings2);
  // Validate partial update 2
  TestValidator.equals(
    "notify_before_cleanup should be updated",
    updatedSettings2.notify_before_cleanup,
    partialUpdate2.notify_before_cleanup,
  );
  TestValidator.equals(
    "permanent_deletion_confirmation should be updated",
    updatedSettings2.permanent_deletion_confirmation,
    partialUpdate2.permanent_deletion_confirmation,
  );
  // Fields from previous update should remain unchanged
  TestValidator.equals(
    "retention_period_days should remain from previous update",
    updatedSettings2.retention_period_days,
    updatedSettings1.retention_period_days,
  );
  TestValidator.equals(
    "auto_cleanup_enabled should remain from previous update",
    updatedSettings2.auto_cleanup_enabled,
    updatedSettings1.auto_cleanup_enabled,
  );
  // Fields not included in either update should remain as initial
  TestValidator.equals(
    "notify_days_before should remain as initial",
    updatedSettings2.notify_days_before,
    initialSettings.notify_days_before,
  );
  // Final timestamp validation
  TestValidator.predicate(
    "final updated_at should be newest",
    new Date(updatedSettings2.updated_at) >
      new Date(updatedSettings1.updated_at),
  );
  TestValidator.equals(
    "created_at should remain unchanged throughout",
    updatedSettings2.created_at,
    initialSettings.created_at,
  );
}
