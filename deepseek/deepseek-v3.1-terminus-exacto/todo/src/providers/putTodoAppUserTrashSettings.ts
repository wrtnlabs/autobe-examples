import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTrashSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashSetting";
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

export async function putTodoAppUserTrashSettings(props: {
  user: UserPayload;
  body: ITodoAppTrashSetting.IUpdate;
}): Promise<ITodoAppTrashSetting> {
  // Verify user exists and has trash settings
  const trashSettings =
    await MyGlobal.prisma.todo_app_trash_settings.findUnique({
      where: { todo_app_user_id: props.user.id },
      ...TodoAppTrashSettingTransformer.select(),
    });
  if (!trashSettings) {
    throw new HttpException("Trash settings not found for user", 404);
  }
  // Validate business rules
  if (props.body.retention_period_days !== undefined) {
    if (
      props.body.retention_period_days < 1 ||
      props.body.retention_period_days > 365
    ) {
      throw new HttpException(
        "Retention period must be between 1 and 365 days",
        400,
      );
    }
  }
  // Validate notification timing if notifications are enabled
  if (
    props.body.notify_before_cleanup !== undefined &&
    props.body.notify_before_cleanup
  ) {
    const retentionPeriod =
      props.body.retention_period_days ?? trashSettings.retention_period_days;
    const notifyDaysBefore =
      props.body.notify_days_before ?? trashSettings.notify_days_before;
    if (notifyDaysBefore >= retentionPeriod) {
      throw new HttpException(
        "Notification days must be less than retention period",
        400,
      );
    }
  }
  // Also validate if notify_days_before is provided but notify_before_cleanup is false
  if (
    props.body.notify_days_before !== undefined &&
    (props.body.notify_before_cleanup === false ||
      (!props.body.notify_before_cleanup &&
        !trashSettings.notify_before_cleanup))
  ) {
    throw new HttpException(
      "Notification days setting requires notifications to be enabled",
      400,
    );
  }
  // Prepare update data
  const updateData: Prisma.todo_app_trash_settingsUpdateInput = {
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
    updated_at: new Date(),
  };
  // Perform update
  const updatedSettings = await MyGlobal.prisma.todo_app_trash_settings.update({
    where: { id: trashSettings.id },
    data: updateData,
    ...TodoAppTrashSettingTransformer.select(),
  });
  return await TodoAppTrashSettingTransformer.transform(updatedSettings);
}
