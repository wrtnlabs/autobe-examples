import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
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

export async function postEcommerceMallAuthGuestJoin(props: {
  ip: string;
  body: IEcommerceMallGuest.IJoin;
}): Promise<IEcommerceMallGuest.IAuthorized> {
  // Check if guest with fingerprint already exists
  const existingGuest = await MyGlobal.prisma.ecommerce_mall_guests.findFirst({
    where: {
      fingerprint: props.body.fingerprint,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const guestId: string & tags.Format<"uuid"> =
    existingGuest !== null
      ? existingGuest.id
      : (
          await MyGlobal.prisma.ecommerce_mall_guests.create({
            data: {
              id: v4(),
              fingerprint: props.body.fingerprint,
              ip_address: props.body.ip ?? props.ip,
              user_agent: null,
              last_active_at: null,
              created_at: toISOStringSafe(new Date()),
              updated_at: toISOStringSafe(new Date()),
              deleted_at: null,
            },
            select: {
              id: true,
            },
          })
        ).id;
  // Calculate datetime strings for token and session expiration
  const nowMs: number = Date.now();
  const accessExpiryMs: number = nowMs + 15 * 60 * 1000; // 15 minutes
  const refreshExpiryMs: number = nowMs + 7 * 24 * 60 * 60 * 1000; // 7 days
  const createdAtStr: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const accessExpiryStr: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(accessExpiryMs),
  );
  const refreshExpiryStr: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(refreshExpiryMs),
  );
  // Create session for the guest
  const session = await MyGlobal.prisma.ecommerce_mall_guest_sessions.create({
    data: {
      id: v4(),
      ecommerce_mall_guest_id: guestId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(new Date(accessExpiryMs)),
    },
    select: {
      id: true,
    },
  });
  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: session.id,
        created_at: createdAtStr,
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
        created_at: createdAtStr,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiryStr,
    refreshable_until: refreshExpiryStr,
  };
  // Update guest's last_active_at timestamp
  await MyGlobal.prisma.ecommerce_mall_guests.update({
    where: { id: guestId },
    data: {
      last_active_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: guestId,
    token,
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
// import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthGuestJoin(props: {
//   ip: string;
//   body: IEcommerceMallGuest.IJoin;
// }): Promise<IEcommerceMallGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------