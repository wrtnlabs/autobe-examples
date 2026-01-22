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
import { TodoAppUserEmailVerificationTransformer } from "../transformers/TodoAppUserEmailVerificationTransformer";

export async function putTodoAppUserUserEmailVerificationsUserEmailVerificationId(props: {
  user: UserPayload;
  userEmailVerificationId: string & tags.Format<"uuid">;
  body: ITodoAppUserEmailVerification.IUpdate;
}): Promise<ITodoAppUserEmailVerification> {
  const existing =
    await MyGlobal.prisma.todo_app_user_email_verifications.findUnique({
      where: { id: props.userEmailVerificationId },
      select: { id: true, user_id: true },
    });
  if (!existing) {
    throw new HttpException("User email verification not found", 404);
  }
  if (existing.user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden - You can only update your own email verification records",
      403,
    );
  }
  const data = {
    token: props.body.token,
    token_expired_at:
      props.body.tokenExpiredAt !== null &&
      props.body.tokenExpiredAt !== undefined
        ? toISOStringSafe(props.body.tokenExpiredAt)
        : undefined,
    verified_at:
      props.body.verifiedAt !== null && props.body.verifiedAt !== undefined
        ? toISOStringSafe(props.body.verifiedAt)
        : undefined,
    deleted_at:
      props.body.deletedAt !== null && props.body.deletedAt !== undefined
        ? toISOStringSafe(props.body.deletedAt)
        : undefined,
    created_at: toISOStringSafe(props.body.createdAt),
  };
  const updated =
    await MyGlobal.prisma.todo_app_user_email_verifications.update({
      where: { id: props.userEmailVerificationId },
      data: data,
    });
  const fullUpdated =
    await MyGlobal.prisma.todo_app_user_email_verifications.findUnique({
      where: { id: updated.id },
      ...TodoAppUserEmailVerificationTransformer.select(),
    });
  if (!fullUpdated) {
    throw new HttpException("Updated email verification record not found", 500);
  }
  return await TodoAppUserEmailVerificationTransformer.transform(fullUpdated);
}
