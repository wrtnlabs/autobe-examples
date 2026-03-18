import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingAuthGuestRefresh(props: {
  body: IErpHrmTimeTrackingGuest.IRefresh;
}): Promise<IErpHrmTimeTrackingGuest.IAuthorized> {
  const secret = MyGlobal.env.JWT_SECRET_KEY;
  const decoded = (() => {
    try {
      return jwt.verify(props.body.refreshToken, secret, { issuer: "autobe" });
    } catch {
      throw new HttpException("Unauthorized", 401);
    }
  })();
  const payload: Record<string, unknown> =
    typeof decoded === "object" && decoded !== null
      ? (decoded as Record<string, unknown>)
      : {};
  const guestId = payload["id"];
  const sessionId = payload["session_id"];
  const tokenType = payload["type"];
  if (
    tokenType !== "guest" ||
    typeof guestId !== "string" ||
    typeof sessionId !== "string"
  ) {
    throw new HttpException("Unauthorized", 401);
  }
  const session =
    await MyGlobal.prisma.erp_hrm_time_tracking_guest_sessions.findFirst({
      where: {
        id: sessionId,
        erp_hrm_time_tracking_guest_id: guestId,
      },
      select: {
        id: true,
        erp_hrm_time_tracking_guest_id: true,
        expired_at: true,
      },
    });
  if (!session || session.expired_at === null) {
    throw new HttpException("Unauthorized", 401);
  }
  const guest =
    await MyGlobal.prisma.erp_hrm_time_tracking_guests.findUniqueOrThrow({
      where: { id: guestId },
      select: { id: true, deleted_at: true },
    });
  if (guest.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const nowIso = toISOStringSafe(new Date());
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: sessionId,
      created_at: nowIso,
    },
    secret,
    { issuer: "autobe", expiresIn: "1h" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: sessionId,
      created_at: nowIso,
    },
    secret,
    { issuer: "autobe", expiresIn: "7d" },
  );
  const newExpiredAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.erp_hrm_time_tracking_guest_sessions.update({
    where: { id: sessionId },
    data: { expired_at: newExpiredAt },
  });
  return {
    id: guestId,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: nowIso,
      refreshable_until: nowIso,
    },
  };
}
