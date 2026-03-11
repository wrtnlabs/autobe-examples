import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodoFilterSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoFilterSetting";
import { IMultiUserTodoTodoFilterSettingValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoFilterSettingValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoFilterSettingTransformer } from "../transformers/MultiUserTodoTodoFilterSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMultiUserTodoMemberFilterSettingsFilterSettingId(props: {
  member: MemberPayload;
  filterSettingId: string & tags.Format<"uuid">;
  body: IMultiUserTodoTodoFilterSetting.IUpdate;
}): Promise<IMultiUserTodoTodoFilterSetting> {
  // 1. Verify ownership and existence
  const filterSetting =
    await MyGlobal.prisma.multi_user_todo_todo_filter_settings.findUnique({
      where: { id: props.filterSettingId },
      select: { id: true, multi_user_todo_member_id: true },
    });
  if (!filterSetting) {
    throw new HttpException("Filter setting not found", 404);
  }
  if (filterSetting.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException(
      "You don't have permission to update this filter setting",
      403,
    );
  }
  // 2. Update main filter setting
  const updateData: Prisma.multi_user_todo_todo_filter_settingsUpdateInput = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.filter_type !== undefined && {
      filter_type: props.body.filter_type,
    }),
    ...(props.body.is_default !== undefined && {
      is_default: props.body.is_default,
    }),
    updated_at: new Date(),
  };
  // 3. Handle filterSettingValues if provided
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update main record
    await tx.multi_user_todo_todo_filter_settings.update({
      where: { id: props.filterSettingId },
      data: updateData,
    });
    // Handle filter setting values - replace all
    if (props.body.filterSettingValues !== undefined) {
      // Delete existing values
      await tx.multi_user_todo_todo_filter_setting_values.deleteMany({
        where: {
          multi_user_todo_todo_filter_setting_id: props.filterSettingId,
        },
      });
      // Create new values if array is not empty
      if (props.body.filterSettingValues.length > 0) {
        await tx.multi_user_todo_todo_filter_setting_values.createMany({
          data: props.body.filterSettingValues.map((value) => ({
            id: v4(),
            multi_user_todo_todo_filter_setting_id: props.filterSettingId,
            key: value.key ?? "",
            value: value.value ?? "",
            created_at: new Date(),
            updated_at: new Date(),
          })),
        });
      }
    }
  });
  // 4. Fetch and return updated complete entity
  const updated =
    await MyGlobal.prisma.multi_user_todo_todo_filter_settings.findUniqueOrThrow(
      {
        where: { id: props.filterSettingId },
        ...MultiUserTodoTodoFilterSettingTransformer.select(),
      },
    );
  return await MultiUserTodoTodoFilterSettingTransformer.transform(updated);
}
