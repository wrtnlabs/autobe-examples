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

export async function test_api_trash_settings_comprehensive_setup_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate using utility function
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://todoapp.test/auth/join",
      referrer: "https://todoapp.test/test",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Define comprehensive trash settings configuration
  const initialSettings: ITodoAppTrashSetting.IUpdate = {
    retention_period_days: 30,
    auto_cleanup_enabled: true,
    notify_before_cleanup: true,
    notify_days_before: 7,
    permanent_deletion_confirmation: true,
  } satisfies ITodoAppTrashSetting.IUpdate;
  // Update trash settings
  const firstResponse = await api.functional.todoApp.user.trash_settings.update(
    userConnection,
    {
      body: initialSettings,
    },
  );
  typia.assert(firstResponse);
  // Validate response matches input
  TestValidator.equals(
    "retention period matches",
    firstResponse.retention_period_days,
    30,
  );
  TestValidator.equals(
    "auto cleanup enabled",
    firstResponse.auto_cleanup_enabled,
    true,
  );
  TestValidator.equals(
    "notify before cleanup",
    firstResponse.notify_before_cleanup,
    true,
  );
  TestValidator.equals(
    "notify days before",
    firstResponse.notify_days_before,
    7,
  );
  TestValidator.equals(
    "permanent deletion confirmation",
    firstResponse.permanent_deletion_confirmation,
    true,
  );
  TestValidator.equals("not deleted", firstResponse.deleted_at, null);
  // Test idempotency - send identical request again
  const secondResponse =
    await api.functional.todoApp.user.trash_settings.update(userConnection, {
      body: initialSettings,
    });
  typia.assert(secondResponse);
  // Verify business logic: notify_days_before < retention_period_days when notifications enabled
  TestValidator.predicate(
    "notify_days_before less than retention_period_days",
    firstResponse.notify_days_before < firstResponse.retention_period_days,
  );
  // Test partial update functionality
  const partialUpdate: ITodoAppTrashSetting.IUpdate = {
    auto_cleanup_enabled: false,
    notify_before_cleanup: false,
  } satisfies ITodoAppTrashSetting.IUpdate;
  const partialResponse =
    await api.functional.todoApp.user.trash_settings.update(userConnection, {
      body: partialUpdate,
    });
  typia.assert(partialResponse);
  // Verify partial update preserves unchanged fields
  TestValidator.equals(
    "retention period unchanged",
    partialResponse.retention_period_days,
    30,
  );
  TestValidator.equals(
    "auto cleanup disabled",
    partialResponse.auto_cleanup_enabled,
    false,
  );
  TestValidator.equals(
    "notify before cleanup disabled",
    partialResponse.notify_before_cleanup,
    false,
  );
  TestValidator.equals(
    "notify days before unchanged",
    partialResponse.notify_days_before,
    7,
  );
  TestValidator.equals(
    "permanent deletion unchanged",
    partialResponse.permanent_deletion_confirmation,
    true,
  );
  // Test boundary values for retention_period_days (business rule validation)
  const minRetentionSettings: ITodoAppTrashSetting.IUpdate = {
    retention_period_days: 1,
  } satisfies ITodoAppTrashSetting.IUpdate;
  const maxRetentionSettings: ITodoAppTrashSetting.IUpdate = {
    retention_period_days: 365,
  } satisfies ITodoAppTrashSetting.IUpdate;
  const minResponse = await api.functional.todoApp.user.trash_settings.update(
    userConnection,
    {
      body: minRetentionSettings,
    },
  );
  typia.assert(minResponse);
  TestValidator.equals(
    "minimum retention period accepted",
    minResponse.retention_period_days,
    1,
  );
  const maxResponse = await api.functional.todoApp.user.trash_settings.update(
    userConnection,
    {
      body: maxRetentionSettings,
    },
  );
  typia.assert(maxResponse);
  TestValidator.equals(
    "maximum retention period accepted",
    maxResponse.retention_period_days,
    365,
  );
  // Test business constraint violation: notify_days_before NOT less than retention_period_days
  // This should trigger a business error
  const invalidNotifySettings: ITodoAppTrashSetting.IUpdate = {
    retention_period_days: 10,
    notify_before_cleanup: true,
    notify_days_before: 10, // Should be less than 10
  } satisfies ITodoAppTrashSetting.IUpdate;
  await TestValidator.error(
    "invalid notify_days_before should fail",
    async () => {
      await api.functional.todoApp.user.trash_settings.update(userConnection, {
        body: invalidNotifySettings,
      });
    },
  );
}
