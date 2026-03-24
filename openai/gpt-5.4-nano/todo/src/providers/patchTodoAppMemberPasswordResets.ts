import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
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

export async function patchTodoAppMemberPasswordResets(props: {
  member: MemberPayload;
  body: ITodoAppMemberPasswordReset.IRequest;
}): Promise<void> {
  const reset = await MyGlobal.prisma.todo_app_member_password_resets.findFirst(
    {
      where: {
        token: props.body.token,
        deleted_at: null,
        used_at: null,
      },
      select: {
        id: true,
        expires_at: true,
        todo_app_member_id: true,
      },
    },
  );
  if (reset === null) {
    throw new HttpException("Reset token is invalid", 400);
  }
  const now = new Date();
  if (reset.expires_at <= now) {
    throw new HttpException("Reset token is invalid", 400);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const nextPasswordHash = await PasswordUtil.hash(props.body.password);
    await tx.todo_app_members.update({
      where: { id: reset.todo_app_member_id },
      data: {
        password_hash: nextPasswordHash,
      },
    });
    await tx.todo_app_member_password_resets.update({
      where: { id: reset.id },
      data: {
        used_at: now,
        updated_at: now,
      },
    });
  });
}
