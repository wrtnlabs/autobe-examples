import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoUserProfileTransformer } from "../transformers/MultiUserTodoUserProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoMemberProfiles(props: {
  member: MemberPayload;
  body: IMultiUserTodoUserProfile.ICreate;
}): Promise<IMultiUserTodoUserProfile> {
  if (props.body.display_name.trim().length === 0) {
    throw new HttpException("display_name is required", 400);
  }
  const existing =
    await MyGlobal.prisma.multi_user_todo_user_profiles.findFirst({
      where: {
        multi_user_todo_member_id: props.member.id,
        deleted_at: null,
      },
      ...MultiUserTodoUserProfileTransformer.select(),
    });
  if (existing !== null) {
    return await MultiUserTodoUserProfileTransformer.transform(existing);
  }
  const now = new Date();
  const createdAt = toISOStringSafe(now);
  const updatedAt = toISOStringSafe(now);
  const created = await MyGlobal.prisma.multi_user_todo_user_profiles.create({
    data: {
      id: v4(),
      display_name: props.body.display_name,
      multi_user_todo_member_id: props.member.id,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: null,
    },
    ...MultiUserTodoUserProfileTransformer.select(),
  });
  return await MultiUserTodoUserProfileTransformer.transform(created);
}
