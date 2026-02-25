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

export async function test_api_trash_settings_retrieve_user_preferences(
  connection: api.IConnection,
): Promise<void> {
  // Create a user connection and authenticate via join
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.todoApp.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(authorized);
  // Retrieve trash settings using the authenticated user connection
  const settings =
    await api.functional.todoApp.user.trash_settings.at(userConnection);
  typia.assert(settings);
  // Validate all expected fields exist and have correct types
  TestValidator.predicate(
    "has id field",
    () => typeof settings.id === "string",
  );
  TestValidator.predicate("id is uuid", () =>
    /^[0-9a-f-]{36}$/i.test(settings.id),
  );
  TestValidator.predicate(
    "retention_period_days is number",
    () => typeof settings.retention_period_days === "number",
  );
  TestValidator.predicate(
    "auto_cleanup_enabled is boolean",
    () => typeof settings.auto_cleanup_enabled === "boolean",
  );
  TestValidator.predicate(
    "notify_before_cleanup is boolean",
    () => typeof settings.notify_before_cleanup === "boolean",
  );
  TestValidator.predicate(
    "notify_days_before is number",
    () => typeof settings.notify_days_before === "number",
  );
  TestValidator.predicate(
    "permanent_deletion_confirmation is boolean",
    () => typeof settings.permanent_deletion_confirmation === "boolean",
  );
  TestValidator.predicate(
    "created_at is string",
    () => typeof settings.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is string",
    () => typeof settings.updated_at === "string",
  );
  TestValidator.predicate(
    "deleted_at is string or null",
    () =>
      settings.deleted_at === null || typeof settings.deleted_at === "string",
  );
  // Validate numeric constraints
  TestValidator.predicate("retention_period_days is int32", () =>
    Number.isInteger(settings.retention_period_days),
  );
  TestValidator.predicate("notify_days_before is int32", () =>
    Number.isInteger(settings.notify_days_before),
  );
  // Validate date-time formats
  TestValidator.predicate("created_at is ISO date-time", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(settings.created_at),
  );
  TestValidator.predicate("updated_at is ISO date-time", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(settings.updated_at),
  );
  if (settings.deleted_at !== null) {
    TestValidator.predicate("deleted_at is ISO date-time", () =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(settings.deleted_at!),
    );
  }
}