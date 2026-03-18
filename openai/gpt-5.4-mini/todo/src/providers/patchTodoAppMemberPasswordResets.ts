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
import { TodoAppMemberTransformer } from "../transformers/TodoAppMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberPasswordResets(props: {
  member: MemberPayload;
  body: ITodoAppMemberPasswordReset.ICreate;
}): Promise<ITodoAppMember> {
  const reset =
    await MyGlobal.prisma.todo_app_member_password_resets.findUnique({
      where: {
        token: props.body.token,
      },
      select: {
        id: true,
        todo_app_member_id: true,
        used_at: true,
        expired_at: true,
      },
    });
  if (
    reset === null ||
    reset.used_at !== null ||
    reset.expired_at.getTime() <= Date.now()
  ) {
    throw new HttpException("Invalid password reset token", 403);
  }
  const member = await MyGlobal.prisma.$transaction(async (prisma) => {
    const updatedReset =
      await prisma.todo_app_member_password_resets.updateMany({
        where: {
          id: reset.id,
          used_at: null,
          expired_at: {
            gt: new Date(),
          },
        },
        data: {
          used_at: new Date(),
        },
      });
    if (updatedReset.count !== 1) {
      throw new HttpException("Invalid password reset token", 403);
    }
    await prisma.todo_app_members.update({
      where: {
        id: reset.todo_app_member_id,
        deleted_at: null,
      },
      data: {
        password_hash: await PasswordUtil.hash(String(props.body.password)),
        updated_at: new Date(),
      },
    });
    return prisma.todo_app_members.findUniqueOrThrow({
      where: {
        id: reset.todo_app_member_id,
        deleted_at: null,
      },
      ...TodoAppMemberTransformer.select(),
    });
  });
  return await TodoAppMemberTransformer.transform(member);
}
