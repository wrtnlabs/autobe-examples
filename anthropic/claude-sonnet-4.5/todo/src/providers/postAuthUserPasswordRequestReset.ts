import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function postAuthUserPasswordRequestReset(props: {
  body: ITodoListUser.IRequestPasswordReset;
}): Promise<ITodoListUser.IPasswordResetInitiated> {
  const email = props.body.email.trim().toLowerCase();
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 60 * 1000);

  const genericMessage = {
    message:
      "If an account exists for this email, password reset instructions will be sent.",
  };

  try {
    const user = await MyGlobal.prisma.todo_list_users.findUnique({
      where: { email },
    });

    if (!user || user.disabled_at !== null) {
      // Always return the same message regardless of user presence/status
      return genericMessage;
    }

    // Secure token generation (64 hex chars, cryptographically strong)
    const crypto = await import("crypto");

    const { promisify } = await import("util");

    const randomBytesAsync = promisify(crypto.randomBytes);
    const tokenBuf = await randomBytesAsync(32);
    const token = tokenBuf.toString("hex");
    const resetRecordId = v4();

    await MyGlobal.prisma.todo_list_password_reset_tokens.create({
      data: {
        id: resetRecordId,
        token,
        todo_list_user_id: user.id,
        created_at: toISOStringSafe(now),
        expires_at: toISOStringSafe(expires),
        used_at: null,
      },
    });
    // Optionally, trigger out-of-band delivery system here (not in scope)
    return genericMessage;
  } catch (err) {
    // Mask timing and error details from the outside
    return genericMessage;
  }
}
