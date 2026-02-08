import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserEmailVerification";
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

export async function getMultiUserTodoUserEmailVerificationsVerificationId(props: {
  user: UserPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoUserEmailVerification> {
  const record =
    await MyGlobal.prisma.multi_user_todo_user_email_verifications.findUnique({
      where: { id: props.verificationId, deleted_at: null },
    });
  if (!record) {
    throw new HttpException("Email verification record not found", 404);
  }
  return {
    id: record.id,
    multi_user_todo_user_id: record.multi_user_todo_user_id,
    token: record.token,
    expires_at: toISOStringSafe(record.expires_at),
    verified_at:
      record.verified_at === null ? null : toISOStringSafe(record.verified_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at:
      record.updated_at === null ? null : toISOStringSafe(record.updated_at),
    deleted_at: null,
  };
}
