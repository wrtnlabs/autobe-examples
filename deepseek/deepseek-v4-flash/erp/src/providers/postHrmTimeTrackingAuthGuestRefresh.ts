import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import { IHrmTimeTrackingGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingGuestSessionTransformer } from "../transformers/HrmTimeTrackingGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingAuthGuestRefresh(props: {
  body: IHrmTimeTrackingGuest.IRefresh;
}): Promise<IHrmTimeTrackingGuest.IAuthorized> {
  // ----
  // 1. Verify refresh token signature and decode payload
  // ----
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    const verified: jwt.JwtPayload | string = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (typeof verified !== "object" || verified === null) {
      throw new Error();
    }
    decoded = typia.assert<{
      id: string;
      session_id: string;
      type: string;
    }>(verified);
  } catch {
    throw new HttpException("Invalid refresh token", 400);
  }
  // ----
  // 2. Validate token type matches expected actor
  // ----
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid refresh token", 400);
  }
  // ----
  // 3. Look up session by decoded session_id and guest_id
  // ----
  const session =
    await MyGlobal.prisma.hrm_time_tracking_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        hrm_time_tracking_guest_id: decoded.id,
      },
    });
  if (session === null) {
    throw new HttpException("Session not found", 401);
  }
  // ----
  // 4. Check session has not expired (millisecond comparison)
  // ----
  if (session.expired_at.getTime() < Date.now()) {
    throw new HttpException("Session expired", 401);
  }
  // ----
  // 5. Verify guest account exists and is not soft-deleted
  // ----
  const guest =
    await MyGlobal.prisma.hrm_time_tracking_guests.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 401);
  }
  // ----
  // 6. Compute time values — all as ISO strings or number offsets
  // ----
  const nowMs: number = Date.now();
  const fifteenMinutesMs: number = 15 * 60 * 1000;
  const thirtyDaysMs: number = 30 * 24 * 60 * 60 * 1000;
  const nowIso: string = toISOStringSafe(new Date(nowMs));
  const accessExpiresIso: string = toISOStringSafe(
    new Date(nowMs + fifteenMinutesMs),
  );
  const refreshExpiresIso: string = toISOStringSafe(
    new Date(nowMs + thirtyDaysMs),
  );
  // ----
  // 7. Generate new access token (15-minute expiry) with SAME session_id
  // ----
  const accessToken: string = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  // ----
  // 8. Generate new refresh token (30-day expiry) with SAME session_id
  // ----
  const refreshToken: string = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d", issuer: "autobe" },
  );
  // ----
  // 9. Extend session expiration to 30 days from now
  // ----
  await MyGlobal.prisma.hrm_time_tracking_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: new Date(nowMs + thirtyDaysMs) },
  });
  // ----
  // 10. Fetch all guest sessions for the response payload
  // ----
  const sessionRecords =
    await MyGlobal.prisma.hrm_time_tracking_guest_sessions.findMany({
      where: { hrm_time_tracking_guest_id: decoded.id },
      ...HrmTimeTrackingGuestSessionTransformer.select(),
    });
  // ----
  // 11. Build and return the full IAuthorized response
  // ----
  return {
    id: guest.id,
    device_fingerprint: guest.device_fingerprint,
    sessions: await ArrayUtil.asyncMap(
      sessionRecords,
      HrmTimeTrackingGuestSessionTransformer.transform,
    ),
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    },
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
// import { IHrmTimeTrackingGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuestSession";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmTimeTrackingAuthGuestRefresh(props: {
//   body: IHrmTimeTrackingGuest.IRefresh;
// }): Promise<IHrmTimeTrackingGuest.IAuthorized> {
//   return {
//     id: ...,
//     device_fingerprint: ...,
//     sessions: await ArrayUtil.asyncMap(..., (r) => HrmTimeTrackingGuestSessionTransformer.transform(r)),
//     created_at: ...,
//     updated_at: ...,
//     deleted_at: ...,
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------