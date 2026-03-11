import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoMemberTransformer } from "../transformers/MultiUserTodoMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMultiUserTodoMemberProfile(props: {
  member: MemberPayload;
  body: IMultiUserTodoMember.IUpdate;
}): Promise<IMultiUserTodoMember> {
  // Validate display name
  if (!props.body.displayName || props.body.displayName.trim().length === 0) {
    throw new HttpException("Display name cannot be empty", 400);
  }
  // Check for valid characters (basic validation)
  const displayName = props.body.displayName.trim();
  if (displayName.length > 100) {
    throw new HttpException("Display name too long", 400);
  }
  // Update the member's display name
  await MyGlobal.prisma.multi_user_todo_members.update({
    where: { id: props.member.id, deleted_at: null },
    data: {
      display_name: displayName,
      updated_at: new Date(),
    },
  });
  // Retrieve updated member with transformer
  const updated =
    await MyGlobal.prisma.multi_user_todo_members.findUniqueOrThrow({
      where: { id: props.member.id },
      ...MultiUserTodoMemberTransformer.select(),
    });
  return await MultiUserTodoMemberTransformer.transform(updated);
}
