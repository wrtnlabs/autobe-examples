import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserEmailVerification";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserUsersMeEmailVerificationsVerificationToken(props: {
  user: UserPayload;
  verificationToken: string;
}): Promise<ITodoListUserEmailVerification> {
  const record =
    await MyGlobal.prisma.todo_list_user_email_verifications.findUnique({
      where: {
        verification_token: props.verificationToken,
      },
    });

  if (!record || record.todo_list_user_id !== props.user.id) {
    throw new HttpException(
      "Verification token not found or inaccessible to user.",
      404,
    );
  }

  return {
    id: record.id,
    todo_list_user_id: record.todo_list_user_id,
    verification_token: record.verification_token,
    consumed_at: record.consumed_at
      ? toISOStringSafe(record.consumed_at)
      : undefined,
    expires_at: toISOStringSafe(record.expires_at),
    created_at: toISOStringSafe(record.created_at),
  };
}
