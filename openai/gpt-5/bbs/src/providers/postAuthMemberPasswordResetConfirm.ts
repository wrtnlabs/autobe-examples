import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

export async function postAuthMemberPasswordResetConfirm(props: {
  body: IEconDiscussMember.IPasswordResetConfirm;
}): Promise<IEconDiscussMember.ISecurityEvent> {
  const { token, new_password } = props.body;

  // 1) Verify token
  let verified: unknown;
  try {
    verified = jwt.verify(token, MyGlobal.env.JWT_SECRET_KEY);
  } catch {
    throw new HttpException("Invalid or expired reset token", 401);
  }

  if (
    typeof verified === "string" ||
    verified === null ||
    typeof verified !== "object"
  ) {
    throw new HttpException("Malformed token payload", 400);
  }

  // 2) Resolve target user id from JWT claims (prefer 'sub', fallback 'user_id')
  let userId: string | undefined = undefined;
  const obj = verified as jwt.JwtPayload; // JwtPayload provides an index signature for claims
  if (typeof obj.sub === "string") {
    userId = obj.sub;
  } else {
    const possible = (obj as Record<string, unknown>)["user_id"];
    if (typeof possible === "string") userId = possible;
  }

  if (!userId) {
    throw new HttpException("Token does not contain a target user", 400);
  }

  // 3) Ensure user exists and is active (not soft-deleted)
  const existing = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: { id: userId, deleted_at: null },
    select: { id: true },
  });
  if (!existing) {
    throw new HttpException("User not found", 404);
  }

  // 4) Hash new password and update credentials
  const now = toISOStringSafe(new Date());
  const hashed = await PasswordUtil.hash(new_password);

  await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: existing.id },
    data: {
      password_hash: hashed,
      updated_at: now,
    },
  });

  // 5) Return standardized security event
  return {
    code: "RESET_CONFIRMED",
    message: "Password reset confirmed.",
    timestamp: toISOStringSafe(new Date()),
  };
}
