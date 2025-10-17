import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussVerifiedExpertPassword } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertPassword";

export async function postAuthVerifiedExpertPasswordForgot(props: {
  body: IEconDiscussVerifiedExpertPassword.IRequest;
}): Promise<void> {
  const { email } = props.body;

  try {
    // Anti-enumeration: perform background flow only if user exists; always return void
    const lowercased = email.toLowerCase();

    const user = await MyGlobal.prisma.econ_discuss_users.findFirst({
      where: {
        deleted_at: null,
        OR: [
          { email: email satisfies string as string },
          { email: lowercased satisfies string as string },
        ],
      },
      select: {
        id: true,
        email_verified: true,
        locale: true,
      },
    });

    if (!user) {
      // Generic success, do not reveal existence
      return;
    }

    // Prepare timestamps (ISO strings)
    const now = toISOStringSafe(new Date());

    // Generate a short-lived reset token (stateless)
    const jti = v4();
    const secret = MyGlobal.env.JWT_SECRET_KEY;

    let token: string | null = null;
    if (secret) {
      token = jwt.sign(
        {
          purpose: "password_reset",
          role: "verifiedExpert",
          jti,
        },
        secret,
        {
          expiresIn: "15m",
          audience: "econDiscuss",
          issuer: "econDiscuss",
          subject: user.id satisfies string as string,
        },
      );
    }

    // Optional out-of-band delivery via notifications table (audit-friendly)
    // Avoid referencing non-existent env properties; send generic instructions
    const title = "Password reset instructions";
    const bodyText = token
      ? "If you requested a password reset, use the issued token with the reset page within 15 minutes."
      : "If you requested a password reset, please follow the instructions sent to your email.";

    await MyGlobal.prisma.econ_discuss_notifications.create({
      data: {
        id: v4() satisfies string as string,
        recipient_user_id: user.id satisfies string as string,
        actor_user_id: null,
        type: "password_reset",
        title,
        body: bodyText,
        entity_type: "user",
        entity_id: user.id satisfies string as string,
        read_at: null,
        created_at: now satisfies string as string,
        updated_at: now satisfies string as string,
        deleted_at: null,
      },
    });

    return;
  } catch (err) {
    // Internal errors should not leak details
    if (
      err instanceof Prisma.PrismaClientKnownRequestError ||
      err instanceof Prisma.PrismaClientValidationError
    ) {
      throw new HttpException("Internal Server Error", 500);
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
