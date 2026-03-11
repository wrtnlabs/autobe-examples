import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodoFilterSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoFilterSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoTodoFilterSettingCollector } from "../collectors/MultiUserTodoTodoFilterSettingCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoFilterSettingTransformer } from "../transformers/MultiUserTodoTodoFilterSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoMemberFilterSettings(props: {
  member: MemberPayload;
  body: IMultiUserTodoTodoFilterSetting.ICreate;
}): Promise<IMultiUserTodoTodoFilterSetting> {
  // Check if filter setting with same name already exists for this member
  const existing =
    await MyGlobal.prisma.multi_user_todo_todo_filter_settings.findFirst({
      where: {
        multi_user_todo_member_id: props.member.id,
        name: props.body.name,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException(
      "A filter setting with this name already exists",
      409,
    );
  }
  // Handle default flag - if setting as default, update any existing default
  if (props.body.is_default) {
    await MyGlobal.prisma.multi_user_todo_todo_filter_settings.updateMany({
      where: {
        multi_user_todo_member_id: props.member.id,
        is_default: true,
        deleted_at: null,
      },
      data: {
        is_default: false,
        updated_at: new Date(),
      },
    });
  }
  // Use Collector to create the filter setting
  const created =
    await MyGlobal.prisma.multi_user_todo_todo_filter_settings.create({
      data: await MultiUserTodoTodoFilterSettingCollector.collect({
        body: props.body,
        multiUserTodoMembers: { id: props.member.id },
      }),
      ...MultiUserTodoTodoFilterSettingTransformer.select(),
    });
  // Transform and return
  return await MultiUserTodoTodoFilterSettingTransformer.transform(created);
}
