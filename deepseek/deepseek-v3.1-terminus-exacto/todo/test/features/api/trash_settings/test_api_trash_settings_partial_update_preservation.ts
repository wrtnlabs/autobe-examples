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
 * Test trash settings partial update preservation.
 * This test verifies that partial field updates preserve existing values for omitted fields.
 */
export async function test_api_trash_settings_partial_update_preservation(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // Generate initial values with correct constraints
  const initialRetention = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>
  >();
  const initialNotifyDays = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<364>
  >();
  // Ensure notify_days_before < retention_period_days for valid initial state
  const safeNotifyDays = Math.min(initialNotifyDays, initialRetention - 1);
  // First update to set baseline configuration
  const initialSettings =
    await api.functional.todoApp.user.trash_settings.update(userConnection, {
      body: {
        retention_period_days: initialRetention satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<365>,
        auto_cleanup_enabled: true,
        notify_before_cleanup: true,
        notify_days_before: safeNotifyDays satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<364>,
        permanent_deletion_confirmation: false,
      } satisfies ITodoAppTrashSetting.IUpdate,
    });
  typia.assert(initialSettings);
  // Store initial values for comparison
  const initialRetentionStored = initialSettings.retention_period_days;
  const initialAutoCleanup = initialSettings.auto_cleanup_enabled;
  const initialNotifyBefore = initialSettings.notify_before_cleanup;
  const initialNotifyDaysStored = initialSettings.notify_days_before;
  const initialPermanentConfirm =
    initialSettings.permanent_deletion_confirmation;
  const initialCreatedAt = initialSettings.created_at;
  const initialUpdatedAt = initialSettings.updated_at;
  // Generate new retention period within bounds
  const newRetentionPeriod = Math.min(initialRetentionStored + 10, 365);
  // Partial update: only provide retention_period_days and permanent_deletion_confirmation
  const partialUpdate = await api.functional.todoApp.user.trash_settings.update(
    userConnection,
    {
      body: {
        retention_period_days: newRetentionPeriod satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<365>,
        permanent_deletion_confirmation: !initialPermanentConfirm,
      } satisfies ITodoAppTrashSetting.IUpdate,
    },
  );
  typia.assert(partialUpdate);
  // Verify explicitly provided fields are updated
  TestValidator.equals(
    "retention_period_days updated",
    partialUpdate.retention_period_days,
    newRetentionPeriod,
  );
  TestValidator.equals(
    "permanent_deletion_confirmation updated",
    partialUpdate.permanent_deletion_confirmation,
    !initialPermanentConfirm,
  );
  // Verify omitted fields retain previous values
  TestValidator.equals(
    "auto_cleanup_enabled preserved",
    partialUpdate.auto_cleanup_enabled,
    initialAutoCleanup,
  );
  TestValidator.equals(
    "notify_before_cleanup preserved",
    partialUpdate.notify_before_cleanup,
    initialNotifyBefore,
  );
  TestValidator.equals(
    "notify_days_before preserved",
    partialUpdate.notify_days_before,
    initialNotifyDaysStored,
  );
  // Verify timestamps: created_at unchanged, updated_at changed
  TestValidator.equals(
    "created_at unchanged",
    partialUpdate.created_at,
    initialCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    partialUpdate.updated_at,
    initialUpdatedAt,
  );
  // Verify other fields exist (typia.assert already validated them)
  TestValidator.predicate("id exists", typeof partialUpdate.id === "string");
  TestValidator.predicate(
    "deleted_at is nullable",
    partialUpdate.deleted_at === null ||
      typeof partialUpdate.deleted_at === "string",
  );
  // Test idempotency: identical partial update should produce same result
  const idempotentUpdate =
    await api.functional.todoApp.user.trash_settings.update(userConnection, {
      body: {
        retention_period_days: newRetentionPeriod satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<365>,
        permanent_deletion_confirmation: !initialPermanentConfirm,
      } satisfies ITodoAppTrashSetting.IUpdate,
    });
  typia.assert(idempotentUpdate);
  // Verify idempotent response matches previous response exactly
  TestValidator.equals(
    "idempotent update matches previous",
    idempotentUpdate,
    partialUpdate,
  );
  // Verify consistent timestamps for idempotent operation
  TestValidator.equals(
    "created_at consistent in idempotent update",
    idempotentUpdate.created_at,
    partialUpdate.created_at,
  );
}
