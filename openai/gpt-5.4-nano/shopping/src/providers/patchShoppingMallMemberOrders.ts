import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberOrders(props: {
  member: MemberPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const placedAtFrom = props.body.placedAtFrom;
  const placedAtTo = props.body.placedAtTo;
  if (placedAtFrom !== undefined && placedAtTo !== undefined) {
    if (placedAtFrom > placedAtTo) {
      throw new HttpException(
        "placedAtFrom must be less than or equal to placedAtTo",
        400,
      );
    }
  }
  const sortBy = props.body.sortBy;
  const sortDirection = props.body.sortDirection ?? "desc";
  const orderBy = (() => {
    if (sortBy === undefined) {
      return { placed_at: "desc" as const };
    }
    if (sortBy === "placed_at") {
      return { placed_at: sortDirection as "asc" | "desc" };
    }
    // Unsupported sort semantics: fall back to newest-first.
    return { placed_at: "desc" as const };
  })();
  const whereBase = {
    shopping_customer_id: props.member.id,
    deleted_at: null,
  } satisfies Prisma.shopping_mall_ordersWhereInput;
  const whereWithPlacedAt = {
    ...whereBase,
    ...(placedAtFrom !== undefined || placedAtTo !== undefined
      ? {
          placed_at: {
            ...(placedAtFrom !== undefined ? { gte: placedAtFrom } : {}),
            ...(placedAtTo !== undefined ? { lte: placedAtTo } : {}),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_ordersWhereInput;
  // Primary listing query: fetch order headers with joinable fields needed for
  // summary derivation.
  const skip = (page - 1) * limit;
  const rawOrders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: whereWithPlacedAt,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      order_code: true,
      placed_at: true,
      deleted_at: true,
      orderItems: {
        select: {
          line_item_status: true,
          seller_price_at_purchase: true,
          quantity: true,
        },
      },
      shipments: {
        select: {
          status: true,
        },
      },
    },
  });
  const totalRecordsAll = await MyGlobal.prisma.shopping_mall_orders.count({
    where: whereWithPlacedAt,
  });
  const deriveOverallStatus = (args: {
    itemStatuses: string[];
    shipmentStatuses: string[];
  }): string => {
    // Domain status derivation rules are specified at a higher level.
    // Here we implement a deterministic aggregation over the available workflow
    // fields.
    //
    // Terminal cancellation/refund take precedence over shipped/delivered.
    const s = args.shipmentStatuses;
    const items = args.itemStatuses;
    const hasCancelled =
      items.includes("cancelled") || items.includes("canceled");
    const hasRefunded = items.includes("refunded");
    const hasCancellationRequested = items.includes("cancellation_requested");
    const hasRefundRequested = items.includes("refund_requested");
    const delivered = s.includes("delivered");
    const shipped = s.includes("shipped");
    // If the order items reflect cancellation/refund, keep it terminal.
    if (hasRefunded) return "refunded";
    if (hasCancelled) return "cancelled";
    if (hasCancellationRequested) return "cancellation_requested";
    if (hasRefundRequested) return "refund_requested";
    // If shipment confirms progress, reflect shipped/delivered.
    if (delivered) return "delivered";
    if (shipped) return "shipped";
    // Otherwise, use the most advanced item workflow state as a best-effort.
    const priority: string[] = [
      "delivered",
      "shipped",
      "placed",
      "created",
      "pending",
    ];
    for (const p of priority) {
      if (items.includes(p)) return p;
    }
    // Fallback to item-status if we have one; otherwise unknown.
    return items[0] ?? "unknown";
  };
  const summariesAll = rawOrders.map(async (order) => {
    const itemStatuses = order.orderItems.map((it) => it.line_item_status);
    const totalPrice = order.orderItems.reduce((acc, it) => {
      return acc + it.seller_price_at_purchase * it.quantity;
    }, 0);
    const shipmentStatuses = order.shipments.map((sh) => sh.status);
    const overallStatus = deriveOverallStatus({
      itemStatuses,
      shipmentStatuses,
    });
    const summary: IShoppingMallOrder.ISummary = {
      id: order.id,
      orderCode: order.order_code,
      placedAt: order.placed_at.toISOString() as string &
        tags.Format<"date-time">,
      totalPrice,
      overallStatus,
      deletedAt:
        order.deleted_at === null
          ? null
          : (order.deleted_at.toISOString() as string &
              tags.Format<"date-time">),
    } satisfies IShoppingMallOrder.ISummary;
    return summary;
  });
  const summaries = await Promise.all(summariesAll);
  const overallStatusFilter = props.body.overallStatus;
  const summariesFiltered =
    overallStatusFilter === undefined
      ? summaries
      : summaries.filter((s) => s.overallStatus === overallStatusFilter);
  const records =
    overallStatusFilter === undefined
      ? totalRecordsAll
      : summariesFiltered.length;
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: records as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(records / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: summariesFiltered,
  } satisfies IPageIShoppingMallOrder.ISummary;
}
