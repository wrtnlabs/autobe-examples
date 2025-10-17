import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

export async function postAuthAdminPasswordResetRequest(props: {
  body: IEconDiscussAdmin.IPasswordResetRequest;
}): Promise<IEconDiscussAdmin.ISecurityEvent> {
  const now = toISOStringSafe(new Date());
  const requestId = v4();

  const normalizedEmail = props.body.email.trim().toLowerCase();

  try {
    const user = await MyGlobal.prisma.econ_discuss_users.findFirst({
      where: {
        email: normalizedEmail,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });

    if (user) {
      await MyGlobal.prisma.econ_discuss_admins.findFirst({
        where: {
          user_id: user.id,
          deleted_at: null,
        },
        select: { id: true },
      });
      // Out-of-band token dispatch would occur here (not modeled in schema)
    }
  } catch {
    // Intentionally swallow internal errors to preserve neutral response and avoid enumeration.
    // Consider logging with requestId in real deployment.
  }

  return {
    outcome: "queued",
    message:
      "If an account exists for this email, a password reset link has been sent.",
    occurred_at: now,
    request_id: requestId,
  };
}
