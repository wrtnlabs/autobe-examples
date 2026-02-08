import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoUserPasswordResetsResetId(props: {
  user: UserPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoUserPasswordReset> {
  const record =
    await MyGlobal.prisma.multi_user_todo_user_password_resets.findFirst({
      where: {
        id: props.resetId,
        deleted_at: null,
      },
    });
  if (record === null) {
    throw new HttpException("Password reset token not found", 404);
  }
  if (record.multi_user_todo_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Audit logging: log the access event
  // Assuming a logging utility is available; if not, use console.log
  // Ideally, replace with your actual logger
  console.log(
    `User ${props.user.id} accessed password reset token ${props.resetId}`,
  );
  // Convert Date fields to string & tags.Format<'date-time'>
  function toDateTimeString(value: Date | null): string | null {
    return value === null ? null : value.toISOString();
  }
  return {
    id: record.id,
    multi_user_todo_user_id: record.multi_user_todo_user_id,
    token: record.token,
    expired_at: toDateTimeString(record.expired_at),
    created_at: toDateTimeString(record.created_at),
    updated_at: toDateTimeString(record.updated_at),
    deleted_at: toDateTimeString(record.deleted_at),
  };
}
