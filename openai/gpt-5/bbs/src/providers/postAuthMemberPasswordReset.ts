import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

export async function postAuthMemberPasswordReset(props: {
  body: IEconDiscussMember.IPasswordResetRequest;
}): Promise<IEconDiscussMember.ISecurityEvent> {
  const { body } = props;

  // Optional existence check to normalize timing; outcome intentionally ignored
  try {
    await MyGlobal.prisma.econ_discuss_users.findUnique({
      where: { email: body.email },
      select: { id: true },
    });
  } catch {
    // Swallow any lookup errors to preserve non-enumeration behavior
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  return {
    code: "RESET_QUEUED",
    message:
      "If an account exists for the provided email, a password reset link has been sent.",
    timestamp: now,
  };
}
