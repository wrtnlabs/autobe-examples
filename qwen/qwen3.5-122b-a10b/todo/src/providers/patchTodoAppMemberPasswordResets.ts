import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppMemberPasswordResetTransformer } from "../transformers/TodoAppMemberPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberPasswordResets(props: {
  member: MemberPayload;
  body: ITodoAppMemberPasswordReset.IRequest;
}): Promise<ITodoAppMemberPasswordReset> {
  const { token, newPassword, newPasswordConfirm } = props.body;
  const now = new Date();
  const record =
    await MyGlobal.prisma.todo_app_member_password_resets.findFirst({
      where: {
        token,
        deleted_at: null,
      },
      ...TodoAppMemberPasswordResetTransformer.select(),
    });
  if (record === null) {
    throw new HttpException("Invalid token", 404);
  }
  if (record.used_at !== null) {
    throw new HttpException("Token has already been used", 400);
  }
  const expiresAt = new Date(record.expires_at);
  if (expiresAt <= now) {
    throw new HttpException("Token has expired", 400);
  }
  if (newPassword !== newPasswordConfirm) {
    throw new HttpException("Passwords do not match", 400);
  }
  const passwordHash: string = await PasswordUtil.hash(newPassword);
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_app_members.update({
      where: { id: record.todoAppMember.id },
      data: {
        password_hash: passwordHash,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.todo_app_member_password_resets.update({
      where: { id: record.id },
      data: {
        used_at: now,
        updated_at: now,
      },
    }),
  ]);
  const updated =
    await MyGlobal.prisma.todo_app_member_password_resets.findUniqueOrThrow({
      where: { id: record.id },
      ...TodoAppMemberPasswordResetTransformer.select(),
    });
  return await TodoAppMemberPasswordResetTransformer.transform(updated);
}
