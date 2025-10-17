import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

export async function postAuthAdminEmailVerify(props: {
  body: IEconDiscussAdmin.IEmailVerifyRequest;
}): Promise<IEconDiscussAdmin.ISecurityEvent> {
  const { token } = props.body;

  const now = toISOStringSafe(new Date());
  let updated = false;

  // Attempt JWT verification first; fall back to decode. Remain neutral on failure.
  let payload: unknown = null;
  try {
    const secret = MyGlobal.env.JWT_SECRET_KEY;
    if (typeof secret === "string" && secret.length > 0) {
      payload = jwt.verify(token, secret);
    } else {
      payload = jwt.decode(token);
    }
  } catch {
    payload = null;
  }

  // Safe helper to inspect payload properties
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;

  let identifiedUserId: string | null = null;
  let identifiedEmail: string | null = null;

  if (isRecord(payload)) {
    const potentialSub = payload["sub"];
    if (typeof potentialSub === "string" && potentialSub.length > 0) {
      identifiedUserId = potentialSub;
    }
    if (!identifiedUserId) {
      const potentialEmail = payload["email"];
      if (typeof potentialEmail === "string" && potentialEmail.length > 0) {
        identifiedEmail = potentialEmail;
      }
    }
  }

  try {
    if (identifiedUserId) {
      const user = await MyGlobal.prisma.econ_discuss_users.findUnique({
        where: { id: identifiedUserId },
        select: { id: true, deleted_at: true },
      });
      if (user && user.deleted_at === null) {
        await MyGlobal.prisma.econ_discuss_users.update({
          where: { id: user.id },
          data: {
            email_verified: true,
            updated_at: now,
          },
        });
        updated = true;
      }
    } else if (identifiedEmail) {
      const user = await MyGlobal.prisma.econ_discuss_users.findUnique({
        where: { email: identifiedEmail },
        select: { id: true, deleted_at: true },
      });
      if (user && user.deleted_at === null) {
        await MyGlobal.prisma.econ_discuss_users.update({
          where: { id: user.id },
          data: {
            email_verified: true,
            updated_at: now,
          },
        });
        updated = true;
      }
    }
  } catch {
    // Preserve neutral response policy; do not reveal database/state errors
  }

  return {
    outcome: updated ? "verified" : "accepted",
    message: updated ? "Email verification completed." : undefined,
    occurred_at: now,
    request_id: v4(),
  };
}
