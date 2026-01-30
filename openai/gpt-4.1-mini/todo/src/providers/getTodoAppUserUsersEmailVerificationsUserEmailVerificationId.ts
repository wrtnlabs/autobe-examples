import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserUsersEmailVerificationsUserEmailVerificationId(props: {
  user: UserPayload;
  userEmailVerificationId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUserEmailVerification> {
  const record =
    await MyGlobal.prisma.todo_app_user_email_verifications.findFirst({
      where: {
        id: props.userEmailVerificationId,
        deleted_at: null,
        user_id: props.user.id,
      },
    });
  if (!record) {
    throw new HttpException("User email verification not found", 404);
  }
  return {
    id: record.id,
    token: record.token,
    token_expired_at:
      record.token_expired_at === null
        ? undefined
        : toISOStringSafe(record.token_expired_at),
    verified_at:
      record.verified_at === null
        ? undefined
        : toISOStringSafe(record.verified_at),
    created_at: toISOStringSafe(record.created_at),
    deleted_at:
      record.deleted_at === null || record.deleted_at === undefined
        ? undefined
        : toISOStringSafe(record.deleted_at),
    user: {}, // ITodoAppUser.ISummary is empty
  };
}
