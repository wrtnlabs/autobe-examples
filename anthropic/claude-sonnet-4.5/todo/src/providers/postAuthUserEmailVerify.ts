import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListEmailVerification";

export async function postAuthUserEmailVerify(props: {
  body: ITodoListEmailVerification.IVerify;
}): Promise<ITodoListEmailVerification.IResult> {
  const verificationRecord =
    await MyGlobal.prisma.todo_list_email_verifications.findUnique({
      where: { token: props.body.token },
      include: { user: true },
    });

  if (!verificationRecord) {
    return {
      success: false,
      message:
        "Invalid verification token. Please check your email and try again.",
      userId: undefined,
    };
  }

  if (verificationRecord.verified) {
    return {
      success: false,
      message:
        "This verification token has already been used. Your email is already verified.",
      userId: undefined,
    };
  }

  const nowISO = toISOStringSafe(new Date());
  const expiresAtISO = toISOStringSafe(verificationRecord.expires_at);

  if (nowISO > expiresAtISO) {
    return {
      success: false,
      message:
        "Verification token has expired. Please request a new verification email.",
      userId: undefined,
    };
  }

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_list_email_verifications.update({
      where: { id: verificationRecord.id },
      data: { verified: true },
    }),
    MyGlobal.prisma.todo_list_users.update({
      where: { id: verificationRecord.todo_list_user_id },
      data: {
        email_verified: true,
        updated_at: new Date(),
      },
    }),
  ]);

  return {
    success: true,
    message:
      "Email successfully verified. You can now access all features of your account.",
    userId: verificationRecord.todo_list_user_id,
  };
}
