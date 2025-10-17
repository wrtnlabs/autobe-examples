import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussVerifiedExpertEmail } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertEmail";
import { VerifiedexpertPayload } from "../decorators/payload/VerifiedexpertPayload";

export async function postAuthVerifiedExpertEmailSendVerification(props: {
  verifiedExpert: VerifiedexpertPayload;
  body: IEconDiscussVerifiedExpertEmail.IRequest;
}): Promise<IEconDiscussVerifiedExpertEmail.ISent> {
  const { verifiedExpert, body } = props;

  // Ensure the account exists and is not soft-deleted
  const user = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: {
      id: verifiedExpert.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!user) {
    throw new HttpException("Forbidden: Account is not available", 403);
  }

  // Create a short-lived verification token for email link dispatch (no DB writes here)
  try {
    jwt.sign(
      {
        sub: verifiedExpert.id,
        purpose: "email_verification",
        role: "verifiedExpert",
        // Transport-only context for localization/routing
        ...(body.locale !== undefined ? { locale: body.locale } : {}),
        ...(body.redirect_uri !== undefined
          ? { redirect_uri: body.redirect_uri }
          : {}),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1d" },
    );
  } catch (_) {
    throw new HttpException("Internal Server Error", 500);
  }

  const requested_at = toISOStringSafe(new Date());
  return {
    queued: true,
    requested_at,
    rate_limit_reset_at: null,
  };
}
