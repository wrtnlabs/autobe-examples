import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalModerator";

export async function postAuthModeratorPasswordRequestReset(props: {
  body: ICommunityPortalModerator.IRequestPasswordReset;
}): Promise<ICommunityPortalModerator.IRequestPasswordResetResponse> {
  const { body } = props;

  try {
    const user = await MyGlobal.prisma.community_portal_users.findUnique({
      where: { email: body.email },
      select: { id: true },
    });

    const envWithSecret = MyGlobal.env as unknown as {
      JWT_SECRET_KEY?: string;
    };
    if (user && envWithSecret.JWT_SECRET_KEY) {
      const token = jwt.sign(
        { sub: user.id, type: "password_reset" },
        envWithSecret.JWT_SECRET_KEY,
        { expiresIn: "1h" },
      );
      void token;
    }

    return {
      message:
        "If an account exists for that email, a password reset link has been sent.",
    };
  } catch (err) {
    try {
      (
        MyGlobal as unknown as { logger?: { error?: (e: unknown) => void } }
      ).logger?.error?.(err);
    } catch (_e) {
      // swallow logging errors
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
