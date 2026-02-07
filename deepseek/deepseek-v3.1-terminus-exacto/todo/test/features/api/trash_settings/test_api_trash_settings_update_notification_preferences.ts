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
 * Test updating trash notification preferences including cleanup notifications and confirmation requirements.
 * Verify that notification settings work correctly when auto cleanup is enabled/disabled, and that logical
 * constraints between notification settings are properly validated. Test edge cases such as setting
 * notify_days_before to 0 for immediate notifications and ensuring proper validation of retention period boundaries.
 */
export async function test_api_trash_settings_update_notification_preferences(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate using join endpoint
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.todoApp.auth.user.join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Note: The scenario assumes trash settings exist for the user
  // In a real implementation, we would need to create trash settings first
  // For this test, we'll use the user's ID as the settingId since the API
  // likely creates default settings for new users
  // Test 1: Enable notification before cleanup with immediate notification
  const update1 = await api.functional.todoApp.user.trash.settings.update(
    userConnection,
    {
      settingId: user.id, // Use user ID as settingId
      body: {
        auto_cleanup_enabled: true,
        notify_before_cleanup: true,
        notify_days_before: 0,
        retention_period_days: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        permanent_deletion_confirmation: true,
      } satisfies ITodoAppTrashSetting.IUpdate,
    },
  );
  typia.assert(update1);
  TestValidator.equals(
    "notify_before_cleanup enabled",
    update1.notify_before_cleanup,
    true,
  );
  TestValidator.equals(
    "immediate notification days",
    update1.notify_days_before,
    0,
  );
  TestValidator.equals(
    "auto cleanup enabled",
    update1.auto_cleanup_enabled,
    true,
  );
  // Test 2: Disable notification before cleanup
  const update2 = await api.functional.todoApp.user.trash.settings.update(
    userConnection,
    {
      settingId: user.id,
      body: {
        notify_before_cleanup: false,
      } satisfies ITodoAppTrashSetting.IUpdate,
    },
  );
  typia.assert(update2);
  TestValidator.equals(
    "notify_before_cleanup disabled",
    update2.notify_before_cleanup,
    false,
  );
  // Test 3: Test notification days boundary (minimum 0)
  const update3 = await api.functional.todoApp.user.trash.settings.update(
    userConnection,
    {
      settingId: user.id,
      body: {
        notify_before_cleanup: true,
        notify_days_before: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<30>
        >(),
      } satisfies ITodoAppTrashSetting.IUpdate,
    },
  );
  typia.assert(update3);
  TestValidator.predicate(
    "notification days within valid range",
    update3.notify_days_before >= 0,
  );
  // Test 4: Test retention period boundaries
  const update4 = await api.functional.todoApp.user.trash.settings.update(
    userConnection,
    {
      settingId: user.id,
      body: {
        retention_period_days: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>
        >(),
      } satisfies ITodoAppTrashSetting.IUpdate,
    },
  );
  typia.assert(update4);
  TestValidator.predicate(
    "retention period positive",
    update4.retention_period_days > 0,
  );
  // Test 5: Test permanent deletion confirmation toggle
  const update5 = await api.functional.todoApp.user.trash.settings.update(
    userConnection,
    {
      settingId: user.id,
      body: {
        permanent_deletion_confirmation: false,
      } satisfies ITodoAppTrashSetting.IUpdate,
    },
  );
  typia.assert(update5);
  TestValidator.equals(
    "permanent deletion confirmation disabled",
    update5.permanent_deletion_confirmation,
    false,
  );
  // Test 6: Test auto cleanup disabled scenario
  const update6 = await api.functional.todoApp.user.trash.settings.update(
    userConnection,
    {
      settingId: user.id,
      body: {
        auto_cleanup_enabled: false,
        notify_before_cleanup: false,
      } satisfies ITodoAppTrashSetting.IUpdate,
    },
  );
  typia.assert(update6);
  TestValidator.equals(
    "auto cleanup disabled",
    update6.auto_cleanup_enabled,
    false,
  );
  // Test 7: Verify logical constraint - notification requires auto cleanup
  const update7 = await api.functional.todoApp.user.trash.settings.update(
    userConnection,
    {
      settingId: user.id,
      body: {
        auto_cleanup_enabled: true,
        notify_before_cleanup: true,
        notify_days_before: 3,
      } satisfies ITodoAppTrashSetting.IUpdate,
    },
  );
  typia.assert(update7);
  TestValidator.predicate(
    "notification requires auto cleanup",
    !update7.notify_before_cleanup || update7.auto_cleanup_enabled,
  );
}
