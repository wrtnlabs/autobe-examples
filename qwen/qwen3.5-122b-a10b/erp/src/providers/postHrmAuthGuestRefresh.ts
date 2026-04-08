import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmGuestTransformer } from "../transformers/HrmGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmAuthGuestRefresh(props: {
  body: IHrmGuest.IRefresh;
}): Promise<IHrmGuest.IAuthorized> {
  // 1. Verify refresh token
  const decoded = typia.assert<{
    session_id: string & tags.Format<"uuid">;
    type: "guest";
  }>(
    jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }),
  );
  // 2. Validate token type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Find and validate session
  const session = await MyGlobal.prisma.hrm_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      expired_at: {
        gte: new Date(),
      },
    },
  });
  if (!session) {
    throw new HttpException("Session expired or not found", 401);
  }
  // 4. Validate guest exists and not deleted
  const guest = await MyGlobal.prisma.hrm_guests.findUnique({
    where: { id: session.hrm_guest_id },
  });
  if (!guest) {
    throw new HttpException("Guest account not found", 401);
  }
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 401);
  }
  // 5. Generate new tokens with same session_id
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      session_id: decoded.session_id,
      type: "guest",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      session_id: decoded.session_id,
      type: "guest",
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.hrm_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 7. Get guest with sessions for response
  const guestWithSessions = await MyGlobal.prisma.hrm_guests.findUniqueOrThrow({
    where: { id: guest.id },
    ...HrmGuestTransformer.select(),
  });
  const transformed = await HrmGuestTransformer.transform(guestWithSessions);
  return {
    id: transformed.id,
    device_fingerprint: transformed.device_fingerprint,
    created_at: transformed.created_at,
    updated_at: transformed.updated_at,
    deleted_at: transformed.deleted_at,
    sessions: transformed.sessions,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
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
// import { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
// import { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmAuthGuestRefresh(props: {
//   body: IHrmGuest.IRefresh;
// }): Promise<IHrmGuest.IAuthorized> {
//   return {
//     id: ...,
//     device_fingerprint: ...,
//     created_at: ...,
//     updated_at: ...,
//     deleted_at: ...,
//     sessions: await ArrayUtil.asyncMap(..., (r) => HrmGuestSessionAtSummaryTransformer.transform(r)),
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------