import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActor";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
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

export async function getShoppingMallCustomerSessionsSessionId(props: {
  customer: CustomerPayload;
  sessionId: string;
}): Promise<IShoppingMallCustomerSession> {
  const sessionId = props.sessionId;
  // Query all three session tables concurrently
  const [customerSession, sellerSession, adminSession] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customer_sessions.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        customer_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_seller_sessions.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        seller_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_administrator_sessions.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        administrator_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    }),
  ]);
  const now = new Date();
  if (customerSession !== null) {
    const customer =
      await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
        where: { id: customerSession.customer_id },
        select: { id: true, email: true, display_name: true },
      });
    return {
      id: customerSession.id,
      actor_type: "customer",
      actor: {
        type: "customer",
        id: customer.id,
        email: customer.email,
        displayName: customer.display_name,
      } satisfies IShoppingMallActor.ISummary,
      ip: customerSession.ip,
      href: customerSession.href,
      referrer: customerSession.referrer,
      created_at: customerSession.created_at.toISOString(),
      expired_at: customerSession.expired_at.toISOString(),
      is_expired: now > customerSession.expired_at,
      is_active: now <= customerSession.expired_at,
    };
  }
  if (sellerSession !== null) {
    const seller =
      await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
        where: { id: sellerSession.seller_id },
        select: { id: true, email: true, shop_name: true },
      });
    return {
      id: sellerSession.id,
      actor_type: "seller",
      actor: {
        type: "seller",
        id: seller.id,
        email: seller.email,
        shopName: seller.shop_name,
      } satisfies IShoppingMallActor.ISummary,
      ip: sellerSession.ip,
      href: sellerSession.href,
      referrer: sellerSession.referrer,
      created_at: sellerSession.created_at.toISOString(),
      expired_at: sellerSession.expired_at.toISOString(),
      is_expired: now > sellerSession.expired_at,
      is_active: now <= sellerSession.expired_at,
    };
  }
  if (adminSession !== null) {
    const admin =
      await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
        where: { id: adminSession.administrator_id },
        select: { id: true, email: true, grade: true },
      });
    return {
      id: adminSession.id,
      actor_type: "administrator",
      actor: {
        type: "administrator",
        id: admin.id,
        email: admin.email,
        grade: admin.grade === "super" ? "super" : "regular",
      } satisfies IShoppingMallActor.ISummary,
      ip: adminSession.ip,
      href: adminSession.href,
      referrer: adminSession.referrer,
      created_at: adminSession.created_at.toISOString(),
      expired_at: adminSession.expired_at.toISOString(),
      is_expired: now > adminSession.expired_at,
      is_active: now <= adminSession.expired_at,
    };
  }
  throw new HttpException("Session not found", 404);
}
