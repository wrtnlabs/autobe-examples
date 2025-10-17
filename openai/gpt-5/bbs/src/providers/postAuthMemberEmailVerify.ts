import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

export async function postAuthMemberEmailVerify(props: {
  body: IEconDiscussMember.IEmailVerifyRequest;
}): Promise<IEconDiscussMember.IEmailVerification> {
  const { token } = props.body;

  const now = toISOStringSafe(new Date());

  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, MyGlobal.env.JWT_SECRET_KEY);
  } catch (_e) {
    throw new HttpException("Invalid or expired verification token", 401);
  }

  if (typeof decoded !== "object" || decoded === null) {
    throw new HttpException("Invalid verification token payload", 400);
  }

  // subject (user id) must exist
  if (!("sub" in decoded) || typeof decoded.sub !== "string") {
    throw new HttpException("Verification token missing subject", 400);
  }

  // Optional purpose/type gating (best-effort, only if present)
  if (
    ("purpose" in decoded && typeof decoded.purpose === "string") ||
    ("type" in decoded && typeof decoded.type === "string")
  ) {
    const marker =
      "purpose" in decoded && typeof decoded.purpose === "string"
        ? decoded.purpose
        : "type" in decoded && typeof decoded.type === "string"
          ? decoded.type
          : undefined;
    const allowed = [
      "email_verify",
      "email_verification",
      "verify_email",
      "member_email_verify",
    ];
    if (marker !== undefined && allowed.indexOf(marker) === -1) {
      throw new HttpException("Invalid verification token purpose", 401);
    }
  }

  const user = await MyGlobal.prisma.econ_discuss_users.findUniqueOrThrow({
    where: { id: decoded.sub },
  });

  if (user.email_verified === true) {
    return {
      email: user.email,
      email_verified: true,
      status: "already_verified",
      requested_at: now,
      processed_at: now,
    };
  }

  await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: user.id },
    data: {
      email_verified: true,
      updated_at: now,
    },
  });

  return {
    email: user.email,
    email_verified: true,
    status: "verified",
    requested_at: now,
    processed_at: now,
  };
}
