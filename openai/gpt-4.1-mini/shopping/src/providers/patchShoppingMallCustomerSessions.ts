import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
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

export async function patchShoppingMallCustomerSessions(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerSession.IRequest;
}): Promise<IPageIShoppingMallCustomerSession.ISummary> {
  // Use fixed pagination defaults because props.body.page and limit do not exist
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Empty filter because deleted_at does not exist in Prisma WhereInput types
  const customerWhere: Prisma.shopping_mall_customer_sessionsWhereInput = {};
  const sellerWhere: Prisma.shopping_mall_seller_sessionsWhereInput = {};
  // Query customer sessions
  const [customerSessions, customerSessionsCount] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customer_sessions.findMany({
      where: customerWhere,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_customer_sessions.count({
      where: customerWhere,
    }),
  ]);
  // Query seller sessions
  const [sellerSessions, sellerSessionsCount] = await Promise.all([
    MyGlobal.prisma.shopping_mall_seller_sessions.findMany({
      where: sellerWhere,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
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
    MyGlobal.prisma.shopping_mall_seller_sessions.count({ where: sellerWhere }),
  ]);
  // Define session type
  type Session = {
    id: string & tags.Format<"uuid">;
    user_type: "customer" | "seller";
    user_id: string & tags.Format<"uuid">;
    ip: string | null;
    href: string | null;
    referrer: string | null;
    created_at: string & tags.Format<"date-time">;
    expired_at: (string & tags.Format<"date-time">) | null;
  };
  // Map customer sessions
  const mappedCustomerSessions: Session[] = customerSessions.map((session) => ({
    id: session.id,
    user_type: "customer",
    user_id: session.shopping_mall_customer_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at) as string &
      tags.Format<"date-time">,
    expired_at: session.expired_at
      ? (toISOStringSafe(session.expired_at) as string &
          tags.Format<"date-time">)
      : null,
  }));
  // Map seller sessions
  const mappedSellerSessions: Session[] = sellerSessions.map((session) => ({
    id: session.id,
    user_type: "seller",
    user_id: session.seller_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at) as string &
      tags.Format<"date-time">,
    expired_at: session.expired_at
      ? (toISOStringSafe(session.expired_at) as string &
          tags.Format<"date-time">)
      : null,
  }));
  // Merge and sort sessions by created_at desc
  const allSessions = [...mappedCustomerSessions, ...mappedSellerSessions].sort(
    (a, b) =>
      a.created_at > b.created_at ? -1 : a.created_at < b.created_at ? 1 : 0,
  );
  // Slice first limit after merging
  const pagedSessions = allSessions.slice(0, limit);
  // Return combined summary
  return {
    pagination: {
      current: page,
      limit,
      records: customerSessionsCount + sellerSessionsCount,
      pages: Math.ceil((customerSessionsCount + sellerSessionsCount) / limit),
    },
    data: pagedSessions,
  };
}
