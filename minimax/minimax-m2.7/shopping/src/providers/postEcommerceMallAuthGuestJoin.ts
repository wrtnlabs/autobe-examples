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
  const guestId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  const sessionId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  const now: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const accessExpires: string & tags.Format<"date-time"> = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshExpires: string & tags.Format<"date-time"> = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  // Create guest record
  await MyGlobal.prisma.ecommerce_mall_guests.create({
    data: {
      id: guestId,
      fingerprint: props.body.fingerprint,
      ip_address: props.ip,
      user_agent: null,
      last_active_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // Create session record
  await MyGlobal.prisma.ecommerce_mall_guest_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_guest_id: guestId,
      ip: props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        created_at: now,
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
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    id: guestId,
    ipAddress: props.ip,
    userAgent: null,
    lastActiveAt: now,
    createdAt: now,
    updatedAt: now,
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