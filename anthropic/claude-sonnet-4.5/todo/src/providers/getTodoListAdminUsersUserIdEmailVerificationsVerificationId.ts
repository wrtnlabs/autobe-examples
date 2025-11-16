import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListEmailVerification";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoListAdminUsersUserIdEmailVerificationsVerificationId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  verificationId: string & tags.Format<"uuid">;
}): Promise<ITodoListEmailVerification> {
  const verification =
    await MyGlobal.prisma.todo_list_email_verifications.findUnique({
      where: {
        id: props.verificationId,
      },
    });

  if (!verification) {
    throw new HttpException("Email verification record not found", 404);
  }

  if (verification.todo_list_user_id !== props.userId) {
    throw new HttpException(
      "Email verification record does not belong to the specified user",
      403,
    );
  }

  return {
    id: verification.id,
    todo_list_user_id: verification.todo_list_user_id,
    token: verification.token,
    verified: verification.verified,
    created_at: toISOStringSafe(verification.created_at),
    expires_at: toISOStringSafe(verification.expires_at),
  };
}
