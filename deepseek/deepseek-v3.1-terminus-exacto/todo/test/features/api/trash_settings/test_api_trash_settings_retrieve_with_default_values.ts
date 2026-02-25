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

export async function test_api_trash_settings_retrieve_with_default_values(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user to test default settings
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Retrieve trash settings for the newly created user
  const trashSettings =
    await api.functional.todoApp.user.trash_settings.at(userConnection);
  typia.assert(trashSettings);
  // 3. Validate default values are present and reasonable
  TestValidator.predicate(
    "retention period is int32",
    Number.isInteger(trashSettings.retention_period_days) &&
      trashSettings.retention_period_days > 0,
  );
  TestValidator.predicate(
    "auto_cleanup_enabled is boolean",
    typeof trashSettings.auto_cleanup_enabled === "boolean",
  );
  TestValidator.predicate(
    "notify_before_cleanup is boolean",
    typeof trashSettings.notify_before_cleanup === "boolean",
  );
  TestValidator.predicate(
    "notify_days_before is int32",
    Number.isInteger(trashSettings.notify_days_before) &&
      trashSettings.notify_days_before >= 0,
  );
  TestValidator.predicate(
    "permanent_deletion_confirmation is boolean",
    typeof trashSettings.permanent_deletion_confirmation === "boolean",
  );
  // 4. Validate timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    () => new Date(trashSettings.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => new Date(trashSettings.updated_at).toString() !== "Invalid Date",
  );
  TestValidator.equals(
    "deleted_at is null for default settings",
    trashSettings.deleted_at,
    null,
  );
}
