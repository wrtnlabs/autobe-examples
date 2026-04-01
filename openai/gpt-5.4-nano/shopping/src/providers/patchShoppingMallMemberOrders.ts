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
    const fromMs = Date.parse(placedAtFrom);
    const toMs = Date.parse(placedAtTo);
    if (fromMs > toMs) {
      throw new HttpException("placedAtFrom must be <= placedAtTo", 400);
    }
  }
  const sortDirection = props.body.sortDirection ?? "desc";
  const orderByPlacedAt =
    sortDirection === "asc"
      ? { placed_at: "asc" as const }
      : { placed_at: "desc" as const };
  const whereBase = {
    deleted_at: null,
    shopping_customer_id: props.member.id,
    ...(placedAtFrom !== undefined && {
      placed_at: {
        ...(placedAtTo !== undefined
          ? { gte: placedAtFrom, lte: placedAtTo }
          : { gte: placedAtFrom }),
      },
    }),
    ...(placedAtFrom === undefined &&
      placedAtTo !== undefined && { placed_at: { lte: placedAtTo } }),
  } as const;
  const skip = (page - 1) * limit;
  const [orders, records] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_orders.findMany({
      where: whereBase,
      skip,
      take: limit,
      orderBy: orderByPlacedAt,
      select: {
        id: true,
        order_code: true,
        placed_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_orders.count({ where: whereBase }),
  ]);
  const orderIds = orders.map((o) => o.id);
  if (orderIds.length === 0) {
    return {
      pagination: {
        current: page,
        limit,
        records,
        pages: Math.ceil(records / limit),
      },
      data: [],
    };
  }
  const items = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_order_id: { in: orderIds },
    },
    select: {
      shopping_mall_order_id: true,
      seller_price_at_purchase: true,
      quantity: true,
      line_item_status: true,
      shipment: { select: { status: true } },
    },
  });
  const totalsByOrder = new Map<string, number>();
  const statusByOrder = new Map<string, string>();
  for (const item of items) {
    const key = item.shopping_mall_order_id;
    const prev = totalsByOrder.get(key) ?? 0;
    totalsByOrder.set(
      key,
      prev + Number(item.seller_price_at_purchase) * Number(item.quantity),
    );
    const shipmentStatus = item.shipment?.status;
    const lineStatus = item.line_item_status;
    const current = statusByOrder.get(key);
    const nextStatus = current ?? "";
    // Simple precedence placeholder; will refine using domain rules.
    // Prefer delivered, else shipped, else cancelled, else refunded, else processing.
    const candidate =
      shipmentStatus === "delivered"
        ? "delivered"
        : shipmentStatus === "shipped"
          ? "shipped"
          : lineStatus === "cancelled"
            ? "cancelled"
            : lineStatus === "refunded"
              ? "refunded"
              : nextStatus || lineStatus;
    statusByOrder.set(key, candidate);
  }
  let data = orders.map((o) => {
    const overallStatus = statusByOrder.get(o.id) ?? "";
    return {
      id: o.id as string & tags.Format<"uuid">,
      orderCode: o.order_code,
      placedAt: o.placed_at.toISOString() as string & tags.Format<"date-time">,
      totalPrice: totalsByOrder.get(o.id) ?? 0,
      overallStatus,
      deletedAt:
        o.deleted_at === null
          ? null
          : (o.deleted_at.toISOString() as string & tags.Format<"date-time">),
    } satisfies IShoppingMallOrder.ISummary;
  });
  if (props.body.overallStatus !== undefined) {
    data = data.filter((d) => d.overallStatus === props.body.overallStatus);
  }
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data,
  } satisfies IPageIShoppingMallOrder.ISummary;
}
