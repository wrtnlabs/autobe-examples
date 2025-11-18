import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function postAuthUserPasswordReset(props: {
  body: ITodoListUser.IResetPassword;
}): Promise<ITodoListUser.IPasswordResetStatus> {
  let decoded: unknown;
  try {
    decoded = jwt.verify(
      props.body.token,
      process.env.PASSWORD_RESET_SECRET || "",
    );
  } catch (_) {
    return { success: false, message: "Invalid or expired reset token." };
  }
  if (
    typeof decoded !== "object" ||
    !decoded ||
    (typeof (decoded as any).email !== "string" &&
      typeof (decoded as any).userId !== "string" &&
      typeof (decoded as any).sub !== "string")
  ) {
    return {
      success: false,
      message: "Invalid or incomplete reset token payload.",
    };
  }
  const maybeEmail =
    typeof (decoded as any).email === "string"
      ? (decoded as any).email
      : undefined;
  const maybeUserId =
    typeof (decoded as any).userId === "string"
      ? (decoded as any).userId
      : undefined;
  const maybeSub =
    typeof (decoded as any).sub === "string" ? (decoded as any).sub : undefined;
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      ...(maybeEmail ? { email: maybeEmail } : {}),
      ...(maybeUserId ? { id: maybeUserId } : maybeSub ? { id: maybeSub } : {}),
    },
  });
  if (!user) {
    return { success: false, message: "No account found for token." };
  }
  const newPasswordHash = await PasswordUtil.hash(props.body.password);
  await MyGlobal.prisma.todo_list_users.update({
    where: { id: user.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.todo_list_user_sessions.deleteMany({
    where: { todo_list_user_id: user.id },
  });
  return {
    success: true,
    message:
      "Password has been reset. Please log in with your new credentials.",
  };
}
