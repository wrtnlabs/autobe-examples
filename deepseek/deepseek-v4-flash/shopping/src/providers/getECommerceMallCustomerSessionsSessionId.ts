import { IECommerceMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getECommerceMallCustomerSessionsSessionId(props: {
  customer: CustomerPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IECommerceMallSession> {
  // Query administrator sessions table
  const adminSession =
    await MyGlobal.prisma.e_commerce_mall_administrator_sessions.findUnique({
      where: { id: props.sessionId },
      select: {
        id: true,
        e_commerce_mall_administrator_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
  if (adminSession) {
    return {
      id: adminSession.id,
      actorType: "administrator",
      actorId: adminSession.e_commerce_mall_administrator_id,
      ip: adminSession.ip,
      href: adminSession.href,
      referrer: adminSession.referrer,
      createdAt: adminSession.created_at.toISOString(),
      expiredAt: adminSession.expired_at.toISOString(),
    } satisfies IECommerceMallSession;
  }
  // Query customer sessions table
  const customerSession =
    await MyGlobal.prisma.e_commerce_mall_customer_sessions.findUnique({
      where: { id: props.sessionId },
      select: {
        id: true,
        e_commerce_mall_customer_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
  if (customerSession) {
    return {
      id: customerSession.id,
      actorType: "customer",
      actorId: customerSession.e_commerce_mall_customer_id,
      ip: customerSession.ip,
      href: customerSession.href,
      referrer: customerSession.referrer,
      createdAt: customerSession.created_at.toISOString(),
      expiredAt: customerSession.expired_at.toISOString(),
    } satisfies IECommerceMallSession;
  }
  // Query seller sessions table
  const sellerSession =
    await MyGlobal.prisma.e_commerce_mall_seller_sessions.findUnique({
      where: { id: props.sessionId },
      select: {
        id: true,
        e_commerce_mall_seller_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
  if (sellerSession) {
    return {
      id: sellerSession.id,
      actorType: "seller",
      actorId: sellerSession.e_commerce_mall_seller_id,
      ip: sellerSession.ip,
      href: sellerSession.href,
      referrer: sellerSession.referrer,
      createdAt: sellerSession.created_at.toISOString(),
      expiredAt: sellerSession.expired_at.toISOString(),
    } satisfies IECommerceMallSession;
  }
  // Query guest sessions table
  const guestSession =
    await MyGlobal.prisma.e_commerce_mall_guest_sessions.findUnique({
      where: { id: props.sessionId },
      select: {
        id: true,
        e_commerce_mall_guest_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
  if (guestSession) {
    return {
      id: guestSession.id,
      actorType: "guest",
      actorId: guestSession.e_commerce_mall_guest_id,
      ip: guestSession.ip,
      href: guestSession.href,
      referrer: guestSession.referrer,
      createdAt: guestSession.created_at.toISOString(),
      expiredAt: guestSession.expired_at.toISOString(),
    } satisfies IECommerceMallSession;
  }
  // No matching session found in any table
  throw new HttpException("Not Found", 404);
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
// import { IECommerceMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSession";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getECommerceMallCustomerSessionsSessionId(props: {
//   customer: CustomerPayload;
//   sessionId: string & tags.Format<"uuid">;
// }): Promise<IECommerceMallSession> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------