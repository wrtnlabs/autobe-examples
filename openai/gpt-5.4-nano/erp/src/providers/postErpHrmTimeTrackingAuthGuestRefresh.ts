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
  // verify jwt
  let decoded: {
    type: string;
    id: string;
    session_id: string;
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as unknown as {
      type: "guest";
      id: string;
      session_id: string;
    };
  } catch {
    throw new HttpException("Unauthorized", 401);
  }
  if (decoded.type !== "guest") throw new HttpException("Forbidden", 403);
  const nowIso = toISOStringSafe(new Date());
  // session + guest check
  const session =
    await MyGlobal.prisma.erp_hrm_time_tracking_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        erp_hrm_time_tracking_guest_id: decoded.id,
      },
      include: { guest: true },
    });
  if (!session || session.guest.deleted_at !== null)
    throw new HttpException("Forbidden", 403);
  const expiredAtIso = toISOStringSafe(session.expired_at as unknown as Date);
  if (expiredAtIso <= nowIso) throw new HttpException("Unauthorized", 401);
  // rotate by extending expiry
  const newRefreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const newAccessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_time_tracking_guest_sessions.update({
      where: { id: session.id },
      data: { expired_at: newRefreshableUntil },
    });
    return session;
  });
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: updated.guest.id,
      session_id: updated.id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: updated.guest.id,
      session_id: updated.id,
      created_at: nowIso,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  return {
    id: updated.guest.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: newAccessExpiredAt,
      refreshable_until: newRefreshableUntil,
    },
  };
}
