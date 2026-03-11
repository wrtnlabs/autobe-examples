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

export async function getMultiUserTodoMemberFilterSettingsFilterSettingIdSettingValuesSettingValueId(props: {
  member: MemberPayload;
  filterSettingId: string & tags.Format<"uuid">;
  settingValueId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoTodoFilterSettingValue> {
  // 1. Verify filter setting exists and belongs to member
  const filterSetting =
    await MyGlobal.prisma.multi_user_todo_todo_filter_settings.findFirst({
      where: {
        id: props.filterSettingId,
        multi_user_todo_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (!filterSetting) {
    throw new HttpException("Filter setting not found or unauthorized", 404);
  }
  // 2. Retrieve the specific setting value with transformer select
  const settingValue =
    await MyGlobal.prisma.multi_user_todo_todo_filter_setting_values.findUniqueOrThrow(
      {
        where: {
          id: props.settingValueId,
          multi_user_todo_todo_filter_setting_id: props.filterSettingId,
        },
        ...MultiUserTodoTodoFilterSettingValueTransformer.select(),
      },
    );
  // 3. Transform and return
  return await MultiUserTodoTodoFilterSettingValueTransformer.transform(
    settingValue,
  );
}
