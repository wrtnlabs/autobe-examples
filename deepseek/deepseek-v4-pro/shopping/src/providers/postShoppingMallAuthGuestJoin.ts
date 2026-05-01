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
import { ShoppingMallGuestTransformer } from "../transformers/ShoppingMallGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthGuestJoin(props: {
  ip: string;
  body: IShoppingMallGuest.IJoin;
}): Promise<IShoppingMallGuest.IAuthorized> {
  // Validate device_fingerprint — must be present and non-empty
  if (
    !props.body.device_fingerprint ||
    props.body.device_fingerprint.trim() === ""
  ) {
    throw new HttpException("Device fingerprint is required", 400);
  }
  // Look up existing guest by device_fingerprint
  // @@unique constraint ensures at most one row (active or soft-deleted)
  const existingGuest = await MyGlobal.prisma.shopping_mall_guests.findUnique({
    where: { device_fingerprint: props.body.device_fingerprint },
  });
  const now = new Date().toISOString();
  let guestId: string;
  if (existingGuest === null) {
    // Not found — create new guest record
    const newGuest = await MyGlobal.prisma.shopping_mall_guests.create({
      data: {
        id: v4(),
        device_fingerprint: props.body.device_fingerprint,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      select: { id: true },
    });
    guestId = newGuest.id;
  } else if (existingGuest.deleted_at !== null) {
    // Previously soft-deleted — reactivate by clearing deleted_at
    await MyGlobal.prisma.shopping_mall_guests.update({
      where: { id: existingGuest.id },
      data: {
        updated_at: now,
        deleted_at: null,
      },
    });
    guestId = existingGuest.id;
  } else {
    // Active guest — reuse, bump updated_at
    await MyGlobal.prisma.shopping_mall_guests.update({
      where: { id: existingGuest.id },
      data: { updated_at: now },
    });
    guestId = existingGuest.id;
  }
  // Compute expiration timestamps
  //   - Access token: 15 minutes
  //   - Refresh token: 24 hours
  //   - Session: 24 hours
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const refreshExpires = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const sessionExpires = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString();
  // Create session record with audit metadata (ip, href, referrer)
  const session = await MyGlobal.prisma.shopping_mall_guest_sessions.create({
    data: {
      id: v4(),
      shopping_mall_guest_id: guestId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: sessionExpires,
    },
    select: { id: true },
  });
  // Generate JWT token pair
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "24h", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // Query the full guest with all sessions for the response
  const guest = await MyGlobal.prisma.shopping_mall_guests.findUniqueOrThrow({
    where: { id: guestId },
    ...ShoppingMallGuestTransformer.select(),
  });
  return {
    ...(await ShoppingMallGuestTransformer.transform(guest)),
    token,
  } satisfies IShoppingMallGuest.IAuthorized;
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
// export async function postShoppingMallAuthGuestJoin(props: {
//   ip: string;
//   body: IShoppingMallGuest.IJoin;
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