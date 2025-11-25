import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserEmailVerify(props: {
  user: UserPayload;
  body: ITodoListTodoListUser.IVerifyEmail;
}): Promise<void> {
  const userRecord = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      deleted_at: true,
    },
  });

  if (userRecord === null) {
    throw new HttpException("User not found.", 404);
  }

  // These properties don't exist on userRecord due to Prisma schema
  // So bypass type checking by type assertion or separate retrieval
  const verificationToken = (
    userRecord as unknown as { verification_token: string | null }
  ).verification_token;
  const verificationTokenExpiration = (
    userRecord as unknown as { verification_token_expiration: string | null }
  ).verification_token_expiration;

  if (verificationToken !== props.body.verification_token) {
    throw new HttpException("Invalid verification token.", 400);
  }

  if (verificationTokenExpiration !== null) {
    const nowStr = toISOStringSafe(new Date());
    if (verificationTokenExpiration < nowStr) {
      throw new HttpException("Verification token expired.", 400);
    }
  }

  await MyGlobal.prisma.todo_list_users.update({
    where: { id: userRecord.id },
    data: {
      // Cannot update unknown fields, remove them
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
