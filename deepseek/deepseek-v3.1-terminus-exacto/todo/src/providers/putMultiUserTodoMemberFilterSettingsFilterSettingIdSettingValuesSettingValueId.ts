import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { MultiUserTodoTodoFilterSettingValueTransformer } from "../transformers/MultiUserTodoTodoFilterSettingValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMultiUserTodoMemberFilterSettingsFilterSettingIdSettingValuesSettingValueId(props: {
  member: MemberPayload;
  filterSettingId: string & tags.Format<"uuid">;
  settingValueId: string & tags.Format<"uuid">;
  body: IMultiUserTodoTodoFilterSettingValue.IUpdate;
}): Promise<IMultiUserTodoTodoFilterSettingValue> {
  // Verify parent filter setting belongs to member
  const filterSetting =
    await MyGlobal.prisma.multi_user_todo_todo_filter_settings.findFirstOrThrow(
      {
        where: {
          id: props.filterSettingId,
          multi_user_todo_member_id: props.member.id,
          deleted_at: null,
        },
        select: { id: true },
      },
    );
  // Update the setting value with partial data
  const updateData: Partial<Prisma.multi_user_todo_todo_filter_setting_valuesUpdateInput> =
    {
      updated_at: new Date(),
    };
  if (props.body.key !== undefined) {
    updateData.key = props.body.key;
  }
  if (props.body.value !== undefined) {
    updateData.value = props.body.value;
  }
  await MyGlobal.prisma.multi_user_todo_todo_filter_setting_values.update({
    where: {
      id: props.settingValueId,
      multi_user_todo_todo_filter_setting_id: filterSetting.id,
    },
    data: updateData,
  });
  // Fetch updated value with transformer select
  const updated =
    await MyGlobal.prisma.multi_user_todo_todo_filter_setting_values.findUniqueOrThrow(
      {
        where: { id: props.settingValueId },
        ...MultiUserTodoTodoFilterSettingValueTransformer.select(),
      },
    );
  return await MultiUserTodoTodoFilterSettingValueTransformer.transform(
    updated,
  );
}
