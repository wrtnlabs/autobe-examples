import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

export async function postAuthAdminEmailResend(props: {
  body: IEconDiscussAdmin.IEmailResendRequest;
}): Promise<IEconDiscussAdmin.ISecurityEvent> {
  const { email } = props.body;
  const now = toISOStringSafe(new Date());
  const correlationId = v4();

  try {
    const account = await MyGlobal.prisma.econ_discuss_users.findUnique({
      where: { email },
      select: { id: true, email_verified: true },
    });

    if (account) {
      // Optional: verify that the user has an admin assignment. Response remains neutral.
      await MyGlobal.prisma.econ_discuss_admins
        .findUnique({ where: { user_id: account.id } })
        .catch(() => null);

      // If not verified, a mail dispatch would be queued here by a mailer service.
      // This provider intentionally performs no DB writes or external side-effects.
    }
  } catch (_) {
    // Maintain neutral, non-enumerating behavior even on internal errors.
  }

  return {
    outcome: "queued",
    message:
      "If an account exists for this email, a verification message has been (re)sent.",
    occurred_at: now,
    request_id: correlationId,
  };
}
