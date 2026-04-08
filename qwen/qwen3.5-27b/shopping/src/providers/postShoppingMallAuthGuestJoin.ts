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

export async function postShoppingMallAuthGuestJoin(props: {
  ip: string;
  body: IShoppingMallGuest.IJoin;
}): Promise<IShoppingMallGuest.IAuthorized> {
  // Generate device fingerprint from IP and href
  const deviceFingerprint = `${props.ip}-${props.body.href}`;
  // Check if guest already exists
  const existingGuest = await MyGlobal.prisma.shopping_mall_guests.findFirst({
    where: {
      device_fingerprint: deviceFingerprint,
      deleted_at: null,
    },
  });
  let guest;
  const now = new Date();
  if (existingGuest) {
    // Update existing guest
    guest = await MyGlobal.prisma.shopping_mall_guests.update({
      where: { id: existingGuest.id },
      data: {
        updated_at: now,
      },
      select: {
        id: true,
        device_fingerprint: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  } else {
    // Create new guest
    guest = await MyGlobal.prisma.shopping_mall_guests.create({
      data: {
        id: v4(),
        device_fingerprint: deviceFingerprint,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      select: {
        id: true,
        device_fingerprint: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  }
  // Generate token expiration times
  const accessExpires = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
  const refreshExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
  // Invalidate existing sessions for this guest
  await MyGlobal.prisma.shopping_mall_guest_sessions.deleteMany({
    where: {
      shopping_mall_guests_id: guest.id,
    },
  });
  // Create new session
  const session = await MyGlobal.prisma.shopping_mall_guest_sessions.create({
    data: {
      id: v4(),
      shopping_mall_guests_id: guest.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: refreshExpires,
    },
    select: {
      id: true,
    },
  });
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "24h", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  } satisfies IAuthorizationToken;
  // Return IAuthorized response
  return {
    id: guest.id,
    device_fingerprint: guest.device_fingerprint,
    created_at: guest.created_at.toISOString(),
    updated_at: guest.updated_at.toISOString(),
    deleted_at: guest.deleted_at?.toISOString() ?? null,
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
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallAuthGuestJoin(props: {
//   ip: string;
//   body: IShoppingMallGuest.IJoin;
// }): Promise<IShoppingMallGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------