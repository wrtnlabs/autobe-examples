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

export async function deleteMultiUserTodoMemberFilterSettingsFilterSettingIdSettingValuesSettingValueId(props: {
  member: MemberPayload;
  filterSettingId: string & tags.Format<"uuid">;
  settingValueId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify filter setting exists and belongs to authenticated member
  const filterSetting =
    await MyGlobal.prisma.multi_user_todo_todo_filter_settings.findFirst({
      where: {
        id: props.filterSettingId,
        multi_user_todo_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (filterSetting === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Verify setting value exists and belongs to specified filter setting
  const settingValue =
    await MyGlobal.prisma.multi_user_todo_todo_filter_setting_values.findFirst({
      where: {
        id: props.settingValueId,
        multi_user_todo_todo_filter_setting_id: props.filterSettingId,
      },
    });
  if (settingValue === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Perform hard delete
  await MyGlobal.prisma.multi_user_todo_todo_filter_setting_values.delete({
    where: { id: props.settingValueId },
  });
}
