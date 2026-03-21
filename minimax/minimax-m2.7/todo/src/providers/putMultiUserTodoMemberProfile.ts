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
  // Build update data - include display_name if provided
  const updateData = {
    ...(props.body.display_name !== undefined && {
      display_name: props.body.display_name,
    }),
    updated_at: new Date(),
  } satisfies Prisma.multi_user_todo_membersUpdateInput;
  // Update the member's profile
  await MyGlobal.prisma.multi_user_todo_members.update({
    where: { id: props.member.id },
    data: updateData,
  });
  // Fetch updated record using Transformer
  const updated =
    await MyGlobal.prisma.multi_user_todo_members.findUniqueOrThrow({
      where: { id: props.member.id },
      ...MultiUserTodoMemberTransformer.select(),
    });
  return MultiUserTodoMemberTransformer.transform(updated);
}
