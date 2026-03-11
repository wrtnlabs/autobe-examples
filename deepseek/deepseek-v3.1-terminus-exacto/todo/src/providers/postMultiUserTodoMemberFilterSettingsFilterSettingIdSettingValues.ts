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
import { MultiUserTodoTodoFilterSettingValueCollector } from "../collectors/MultiUserTodoTodoFilterSettingValueCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoFilterSettingValueTransformer } from "../transformers/MultiUserTodoTodoFilterSettingValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoMemberFilterSettingsFilterSettingIdSettingValues(props: {
  member: MemberPayload;
  filterSettingId: string & tags.Format<"uuid">;
  body: IMultiUserTodoTodoFilterSettingValue.ICreate;
}): Promise<IMultiUserTodoTodoFilterSettingValue> {
  // 1. Verify filter setting exists, belongs to member, and is not deleted
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
  if (filterSetting === null) {
    throw new HttpException("Filter setting not found or access denied", 404);
  }
  // 2. Check for duplicate key constraint within same filter setting
  const existingValue =
    await MyGlobal.prisma.multi_user_todo_todo_filter_setting_values.findFirst({
      where: {
        multi_user_todo_todo_filter_setting_id: props.filterSettingId,
        key: props.body.key,
      },
      select: {
        id: true,
      },
    });
  if (existingValue !== null) {
    throw new HttpException("Key already exists for this filter setting", 409);
  }
  // 3. Use collector to prepare data with proper foreign key connection
  const data = await MultiUserTodoTodoFilterSettingValueCollector.collect({
    body: props.body,
    multiUserTodoTodoFilterSettings: { id: props.filterSettingId },
    multiUserTodoMembers: { id: props.member.id },
    multiUserTodoMemberSessions: { id: props.member.session_id },
  });
  // 4. Create the filter setting value record
  const created =
    await MyGlobal.prisma.multi_user_todo_todo_filter_setting_values.create({
      data,
      ...MultiUserTodoTodoFilterSettingValueTransformer.select(),
    });
  // 5. Update parent filter setting's updated_at timestamp
  await MyGlobal.prisma.multi_user_todo_todo_filter_settings.update({
    where: { id: props.filterSettingId },
    data: { updated_at: new Date() },
  });
  // 6. Transform and return the created entity
  return await MultiUserTodoTodoFilterSettingValueTransformer.transform(
    created,
  );
}
