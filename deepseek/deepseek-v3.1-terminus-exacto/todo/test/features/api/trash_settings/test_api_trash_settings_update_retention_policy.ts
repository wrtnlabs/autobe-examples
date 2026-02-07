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
 * Test updating trash retention policy settings for an authenticated user.
 * 1. Create a new user account
 * 2. Retrieve user's trash settings to get settingId
 * 3. Update trash settings with new retention policy
 * 4. Validate updated settings are correctly persisted
 */
export async function test_api_trash_settings_update_retention_policy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user account and authenticate using utility function
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // 2. Retrieve user's trash settings to get the settingId
  const settings = await api.functional.todoApp.user.trash.settings.at(
    userConnection,
    {
      settingId: user.id,
    },
  );
  typia.assert(settings);
  // 3. Update trash settings with new retention policy
  const updateBody = {
    retention_period_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    auto_cleanup_enabled: typia.random<boolean>(),
    notify_before_cleanup: typia.random<boolean>(),
    notify_days_before: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    permanent_deletion_confirmation: typia.random<boolean>(),
  } satisfies ITodoAppTrashSetting.IUpdate;
  const updatedSettings =
    await api.functional.todoApp.user.trash.settings.update(userConnection, {
      settingId: settings.id,
      body: updateBody,
    });
  typia.assert(updatedSettings);
  // 4. Validate updated settings match the request
  TestValidator.equals(
    "retention period updated",
    updatedSettings.retention_period_days,
    updateBody.retention_period_days,
  );
  TestValidator.equals(
    "auto cleanup enabled updated",
    updatedSettings.auto_cleanup_enabled,
    updateBody.auto_cleanup_enabled,
  );
  TestValidator.equals(
    "notify before cleanup updated",
    updatedSettings.notify_before_cleanup,
    updateBody.notify_before_cleanup,
  );
  TestValidator.equals(
    "notify days before updated",
    updatedSettings.notify_days_before,
    updateBody.notify_days_before,
  );
  TestValidator.equals(
    "permanent deletion confirmation updated",
    updatedSettings.permanent_deletion_confirmation,
    updateBody.permanent_deletion_confirmation,
  );
  // 5. Validate timestamps are updated
  TestValidator.notEquals(
    "updated_at timestamp changed",
    settings.updated_at,
    updatedSettings.updated_at,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    settings.created_at,
    updatedSettings.created_at,
  );
  // 6. Validate user ownership
  TestValidator.equals(
    "settings belong to the same user",
    updatedSettings.user.id,
    user.id,
  );
}
