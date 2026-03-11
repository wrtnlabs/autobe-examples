import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteMultiUserTodoMemberFilterSettingsFilterSettingId(props: {
  member: MemberPayload;
  filterSettingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const filterSetting =
    await MyGlobal.prisma.multi_user_todo_todo_filter_settings.findUniqueOrThrow(
      {
        where: { id: props.filterSettingId },
        select: {
          multi_user_todo_member_id: true,
          deleted_at: true,
        } satisfies Prisma.multi_user_todo_todo_filter_settingsFindUniqueArgs["select"],
      },
    );
  if (filterSetting.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("You do not own this filter setting", 403);
  }
  if (filterSetting.deleted_at !== null) {
    throw new HttpException("Filter setting is already deleted", 410);
  }
  await MyGlobal.prisma.multi_user_todo_todo_filter_settings.update({
    where: { id: props.filterSettingId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    } satisfies Prisma.multi_user_todo_todo_filter_settingsUpdateInput,
  });
}
