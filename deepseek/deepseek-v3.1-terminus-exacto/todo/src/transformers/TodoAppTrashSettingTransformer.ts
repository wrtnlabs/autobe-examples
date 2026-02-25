import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTrashSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashSetting";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTrashSettingTransformer {
  export type Payload = Prisma.todo_app_trash_settingsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        retention_period_days: true,
        auto_cleanup_enabled: true,
        notify_before_cleanup: true,
        notify_days_before: true,
        permanent_deletion_confirmation: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: true,
      },
    } satisfies Prisma.todo_app_trash_settingsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTrashSetting> {
    return {
      id: input.id,
      retention_period_days: input.retention_period_days,
      auto_cleanup_enabled: input.auto_cleanup_enabled,
      notify_before_cleanup: input.notify_before_cleanup,
      notify_days_before: input.notify_days_before,
      permanent_deletion_confirmation: input.permanent_deletion_confirmation,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
