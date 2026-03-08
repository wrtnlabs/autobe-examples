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

export async function getTodoAppMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<ITodoAppMemberPasswordReset.IStatus> {
  const record =
    await MyGlobal.prisma.todo_app_member_password_resets.findUniqueOrThrow({
      where: {
        id: props.resetId,
        todo_app_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        token: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
          },
        },
      },
    });
  const now = new Date();
  if (record.expires_at <= now) {
    throw new HttpException("Token expired", 410);
  }
  return {
    valid: true,
    expiresAt: toISOStringSafe(record.expires_at),
    createdAt: toISOStringSafe(record.created_at),
  } satisfies ITodoAppMemberPasswordReset.IStatus;
}
