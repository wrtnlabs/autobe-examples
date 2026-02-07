import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTrashSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashSetting";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTrashSettingTransformer } from "../transformers/TodoAppTrashSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppUserTrashSettingsSettingId(props: {
  user: UserPayload;
  settingId: string & tags.Format<"uuid">;
  body: ITodoAppTrashSetting.IUpdate;
}): Promise<ITodoAppTrashSetting> {
  // First verify ownership and existence
  const existing = await MyGlobal.prisma.todo_app_trash_settings.findUnique({
    where: { id: props.settingId },
    select: { todo_app_user_id: true },
  });
  if (!existing) {
    throw new HttpException("Trash settings not found", 404);
  }
  if (existing.todo_app_user_id !== props.user.id) {
    throw new HttpException("You do not own these trash settings", 403);
  }
  // Update with current timestamp as ISO string
  const updated = await MyGlobal.prisma.todo_app_trash_settings.update({
    where: { id: props.settingId },
    data: {
      ...(props.body.retention_period_days !== undefined && {
        retention_period_days: props.body.retention_period_days,
      }),
      ...(props.body.auto_cleanup_enabled !== undefined && {
        auto_cleanup_enabled: props.body.auto_cleanup_enabled,
      }),
      ...(props.body.notify_before_cleanup !== undefined && {
        notify_before_cleanup: props.body.notify_before_cleanup,
      }),
      ...(props.body.notify_days_before !== undefined && {
        notify_days_before: props.body.notify_days_before,
      }),
      ...(props.body.permanent_deletion_confirmation !== undefined && {
        permanent_deletion_confirmation:
          props.body.permanent_deletion_confirmation,
      }),
      updated_at: new Date().toISOString(),
    },
    ...TodoAppTrashSettingTransformer.select(),
  });
  return await TodoAppTrashSettingTransformer.transform(updated);
}
