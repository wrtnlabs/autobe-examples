import { IEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEvent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEvent";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerAnalyticsSales(props: {
  seller: SellerPayload;
  body: IEcommercePlatformEvent.IRequest;
}): Promise<IPageIEcommercePlatformEvent.ISummary> {
  // Validate and set pagination parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 20), 100);
  const skip = (page - 1) * limit;
  // Safely parse date strings for filtering
  const dateFrom = props.body.date_from
    ? toISOStringSafe(new Date(props.body.date_from))
    : undefined;
  const dateTo = props.body.date_to
    ? toISOStringSafe(new Date(props.body.date_to))
    : undefined;
  // Build WHERE clause for seller's order items with proper date filtering
  const whereInput = {
    seller_id: props.seller.id,
    status: { in: ["paid", "shipped", "delivered"] },
    order: {
      ...(dateFrom && { created_at: { gte: new Date(dateFrom) } }),
      ...(dateTo && { created_at: { lte: new Date(dateTo) } }),
    },
  } satisfies Prisma.ecommerce_order_itemsWhereInput;
  // Query order items with pagination
  const orderItems = await MyGlobal.prisma.ecommerce_order_items.findMany({
    where: whereInput,
    include: {
      order: {
        select: {
          id: true,
          created_at: true,
        },
      },
    },
    skip,
    take: limit,
    orderBy: { order: { created_at: "desc" } },
  });
  const total = await MyGlobal.prisma.ecommerce_order_items.count({
    where: whereInput,
  });
  // Transform to match the expected IEcommercePlatformEvent.ISummary structure
  const data = orderItems.map(
    (item) =>
      ({
        id: item.id as string & tags.Format<"uuid">,
        event_type: "sales_analytics",
        event_severity: "info",
        event_source: "seller_dashboard",
        correlation_id: item.order_id as (string & tags.Format<"uuid">) | null,
        created_at: toISOStringSafe(item.order.created_at),
      }) satisfies IEcommercePlatformEvent.ISummary,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
