import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthGuestRefresh(props: {
  body: IShoppingMallGuest.IRefresh;
}): Promise<IShoppingMallGuest.IAuthorized> {
  const decodedPayload = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  if (typeof decodedPayload !== "object" || decodedPayload === null) {
    throw new HttpException("Invalid refresh token format", 401);
  }
  const guestId = decodedPayload.id;
  const sessionId = decodedPayload.session_id;
  const tokenType = decodedPayload.type;
  if (
    typeof guestId !== "string" ||
    typeof sessionId !== "string" ||
    typeof tokenType !== "string"
  ) {
    throw new HttpException("Invalid refresh token payload", 401);
  }
  if (tokenType !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  const session = await MyGlobal.prisma.shopping_mall_guest_sessions.findFirst({
    where: {
      id: sessionId,
      shopping_mall_guests_id: guestId,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const now = new Date();
  if (session.expired_at <= now) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const guest = await MyGlobal.prisma.shopping_mall_guests.findUniqueOrThrow({
    where: { id: guestId },
    select: {
      id: true,
      device_fingerprint: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  await MyGlobal.prisma.shopping_mall_guest_sessions.update({
    where: { id: sessionId },
    data: { expired_at: refreshExpires },
  });
  return {
    id: guest.id,
    device_fingerprint: guest.device_fingerprint,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: null,
    token: token,
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
// import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallAuthGuestRefresh(props: {
//   body: IShoppingMallGuest.IRefresh;
// }): Promise<IShoppingMallGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------