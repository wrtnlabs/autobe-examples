import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberPasswordResets(props: {
  member: MemberPayload;
  body: IMultiUserTodoMemberPasswordReset.IRequest;
}): Promise<IMultiUserTodoMemberPasswordReset.ISuccess> {
  const reset =
    await MyGlobal.prisma.multi_user_todo_member_password_resets.findUnique({
      where: { token: props.body.token },
    });
  if (reset === null) {
    throw new HttpException("Invalid token", 400);
  }
  if (reset.deleted_at !== null) {
    throw new HttpException("Invalid token", 400);
  }
  if (reset.expires_at.getTime() <= new Date().getTime()) {
    throw new HttpException("Invalid token", 400);
  }
  if (reset.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Invalid token", 400);
  }
  const hashed =
    (await (
      PasswordUtil as unknown as {
        hashPassword?: (value: string) => Promise<string>;
        hash?: (value: string) => Promise<string>;
        encode?: (value: string) => Promise<string>;
      }
    ).hashPassword?.(props.body.password)) ??
    (PasswordUtil as unknown as any).hash?.(props.body.password) ??
    (PasswordUtil as unknown as any).encode?.(props.body.password);
  if (hashed === undefined || hashed === null) {
    throw new HttpException("Invalid password", 400);
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.multi_user_todo_members.update({
      where: { id: props.member.id },
      data: {
        password_hash: hashed,
        updated_at: toISOStringSafe(new Date()),
      },
    }),
    MyGlobal.prisma.multi_user_todo_member_password_resets.update({
      where: { id: reset.id },
      data: { deleted_at: toISOStringSafe(new Date()) },
    }),
  ]);
  return { success: true };
}
