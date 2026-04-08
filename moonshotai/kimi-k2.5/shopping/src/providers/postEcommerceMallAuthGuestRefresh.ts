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

export async function postEcommerceMallAuthGuestRefresh(props: {
  body: IEcommerceMallGuest.IRefresh;
}): Promise<IEcommerceMallGuest.IAuthorized> {
  const payload = jwt.verify(
    props.body.refreshToken,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  ) as {
    type: "guest";
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
  };
  if (payload.type !== "guest") {
    throw new HttpException("Invalid token type", 401);
  }
  const session = await MyGlobal.prisma.ecommerce_mall_guest_sessions.findFirst(
    {
      where: {
        id: payload.session_id,
        ecommerce_mall_guest_id: payload.id,
      },
    },
  );
  if (session === null) {
    throw new HttpException("Session not found or expired", 401);
  }
  const guest = await MyGlobal.prisma.ecommerce_mall_guests.findUniqueOrThrow({
    where: { id: payload.id },
  });
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  const now = Date.now();
  const accessExpiresAt = now + 60 * 60 * 1000;
  const refreshExpiresAt = now + 7 * 24 * 60 * 60 * 1000;
  const accessToken = jwt.sign(
    {
      type: payload.type,
      id: payload.id,
      session_id: payload.session_id,
      created_at: toISOStringSafe(new Date(now)),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: payload.type,
      id: payload.id,
      session_id: payload.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date(now)),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const expiredAtString: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(refreshExpiresAt),
  );
  await MyGlobal.prisma.ecommerce_mall_guest_sessions.update({
    where: { id: payload.session_id },
    data: {
      expired_at: expiredAtString,
      href: props.body.href,
      referrer: props.body.referrer,
      ip: props.body.ip ?? "0.0.0.0",
    },
  });
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(new Date(accessExpiresAt)),
    refreshable_until: expiredAtString,
  };
  return {
    id: guest.id,
    createdAt: toISOStringSafe(guest.created_at),
    updatedAt: toISOStringSafe(guest.updated_at),
    deletedAt:
      guest.deleted_at === null ? null : toISOStringSafe(guest.deleted_at),
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
// export async function postEcommerceMallAuthGuestRefresh(props: {
//   body: IEcommerceMallGuest.IRefresh;
// }): Promise<IEcommerceMallGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------