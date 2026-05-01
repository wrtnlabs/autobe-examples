import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallGuestSessionTransformer } from "../transformers/ShoppingMallGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthGuestRefresh(props: {
  body: IShoppingMallGuest.IRefresh;
}): Promise<IShoppingMallGuest.IAuthorized> {
  const verifiedPayload = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  if (typeof verifiedPayload === "string") {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const guestId: string = String(verifiedPayload.id ?? "");
  const sessionId: string = String(verifiedPayload.session_id ?? "");
  const tokenType: string = String(verifiedPayload.type ?? "");
  if (!guestId || !sessionId || !tokenType) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (tokenType !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  const existingSession =
    await MyGlobal.prisma.shopping_mall_guest_sessions.findFirst({
      where: {
        id: sessionId,
        shopping_mall_guest_id: guestId,
      },
    });
  if (!existingSession || existingSession.expired_at < new Date()) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const guest = await MyGlobal.prisma.shopping_mall_guests.findUnique({
    where: { id: guestId },
  });
  if (!guest || guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 401);
  }
  const newSessionId: string = v4();
  await MyGlobal.prisma.shopping_mall_guest_sessions.create({
    data: {
      id: newSessionId,
      shopping_mall_guest_id: guestId,
      ip: props.body.ip ?? "unknown",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  await MyGlobal.prisma.shopping_mall_guests.update({
    where: { id: guestId },
    data: { updated_at: new Date() },
  });
  const tokenCreatedAt: string = new Date().toISOString();
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: newSessionId,
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: newSessionId,
      tokenType: "refresh",
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const allSessions =
    await MyGlobal.prisma.shopping_mall_guest_sessions.findMany({
      where: { shopping_mall_guest_id: guestId },
      orderBy: { created_at: "desc" },
      ...ShoppingMallGuestSessionTransformer.select(),
    });
  return {
    id: guestId,
    device_fingerprint: guest.device_fingerprint,
    sessions: await ArrayUtil.asyncMap(allSessions, (s) =>
      ShoppingMallGuestSessionTransformer.transform(s),
    ),
    created_at: guest.created_at.toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      refreshable_until: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
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
// import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
// import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallAuthGuestRefresh(props: {
//   body: IShoppingMallGuest.IRefresh;
// }): Promise<IShoppingMallGuest.IAuthorized> {
//   return {
//     id: ...,
//     device_fingerprint: ...,
//     sessions: await ArrayUtil.asyncMap(..., (r) => ShoppingMallGuestSessionTransformer.transform(r)),
//     created_at: ...,
//     updated_at: ...,
//     deleted_at: ...,
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------