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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoFilterSettingTransformer } from "../transformers/MultiUserTodoTodoFilterSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberFilterSettingsFilterSettingId(props: {
  member: MemberPayload;
  filterSettingId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoTodoFilterSetting> {
  const filterSetting =
    await MyGlobal.prisma.multi_user_todo_todo_filter_settings.findUniqueOrThrow(
      {
        where: { id: props.filterSettingId },
        ...MultiUserTodoTodoFilterSettingTransformer.select(),
      },
    );
  if (filterSetting.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (filterSetting.deleted_at !== null) {
    throw new HttpException("Filter setting not found", 404);
  }
  return await MultiUserTodoTodoFilterSettingTransformer.transform(
    filterSetting,
  );
}
