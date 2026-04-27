import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IECommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallAuthGuestJoin(props: {
  ip: string;
  body: IECommerceMallGuest.IJoin;
}): Promise<IECommerceMallGuest.IAuthorized> {
  const now = new Date().toISOString();
  const accessExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const sessionExpiresAt = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString();
  // ----
  // 1. Find or create guest record
  // ----
  const existingGuest = await MyGlobal.prisma.e_commerce_mall_guests.findUnique(
    {
      where: { device_identifier: props.body.device_identifier },
      select: { id: true, deleted_at: true },
    },
  );
  let guestId: string & tags.Format<"uuid">;
  if (existingGuest) {
    // Guest record exists — handle active vs soft-deleted
    if (existingGuest.deleted_at !== null) {
      // Soft-deleted: reactivate by clearing deleted_at and updating timestamp
      const updated = await MyGlobal.prisma.e_commerce_mall_guests.update({
        where: { id: existingGuest.id },
        data: {
          deleted_at: null,
          updated_at: now,
        },
        select: { id: true },
      });
      guestId = typia.assert<string & tags.Format<"uuid">>(updated.id);
    } else {
      // Active: update timestamp only
      const updated = await MyGlobal.prisma.e_commerce_mall_guests.update({
        where: { id: existingGuest.id },
        data: {
          updated_at: now,
        },
        select: { id: true },
      });
      guestId = typia.assert<string & tags.Format<"uuid">>(updated.id);
    }
  } else {
    // No existing guest — create new record
    const created = await MyGlobal.prisma.e_commerce_mall_guests.create({
      data: {
        id: v4(),
        device_identifier: props.body.device_identifier,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      select: { id: true },
    });
    guestId = typia.assert<string & tags.Format<"uuid">>(created.id);
  }
  // ----
  // 2. Create guest session
  // ----
  const sessionId = v4();
  const clientIp = props.body.ip ?? props.ip;
  const createdSession =
    await MyGlobal.prisma.e_commerce_mall_guest_sessions.create({
      data: {
        id: sessionId,
        e_commerce_mall_guest_id: guestId,
        ip: clientIp,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: sessionExpiresAt,
      },
      select: { id: true },
    });
  const validatedSessionId = typia.assert<string & tags.Format<"uuid">>(
    createdSession.id,
  );
  // ----
  // 3. Generate JWT tokens
  // ----
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: validatedSessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: validatedSessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "24h", issuer: "autobe" },
    ),
    expired_at: accessExpiresAt,
    refreshable_until: sessionExpiresAt,
  } satisfies IAuthorizationToken;
  // ----
  // 4. Return IAuthorized
  // ----
  return {
    id: guestId,
    token,
  } satisfies IECommerceMallGuest.IAuthorized;
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
// import { IECommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallAuthGuestJoin(props: {
//   ip: string;
//   body: IECommerceMallGuest.IJoin;
// }): Promise<IECommerceMallGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------