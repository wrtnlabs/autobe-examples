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

export async function putMultiUserTodoMemberPassword(props: {
  member: MemberPayload;
  body: IMultiUserTodoMember.IUpdatePassword;
}): Promise<IMultiUserTodoMember> {
  const member =
    await MyGlobal.prisma.multi_user_todo_members.findUniqueOrThrow({
      where: { id: props.member.id },
      select: { id: true, password_hash: true },
    });
  const currentPasswordHash = await PasswordUtil.hash(
    props.body.current_password,
  );
  if (currentPasswordHash !== member.password_hash) {
    throw new HttpException("Current password is incorrect", 401);
  }
  const newPasswordHash = await PasswordUtil.hash(props.body.new_password);
  await MyGlobal.prisma.multi_user_todo_members.update({
    where: { id: props.member.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.multi_user_todo_members.findUniqueOrThrow({
      where: { id: props.member.id },
      ...MultiUserTodoMemberTransformer.select(),
    });
  return await MultiUserTodoMemberTransformer.transform(updated);
}
