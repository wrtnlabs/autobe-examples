import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import { IPageIShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderStatusHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerOrdersOrderIdStatusHistories(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderStatusHistory.IRequest;
}): Promise<IPageIShoppingMallOrderStatusHistory.ISummary> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    include: {
      shopping_mall_order_sellers: true,
    },
  });

  if (!order || order.deleted_at !== null) {
    throw new HttpException("Order not found", 404);
  }

  const sellerAssociation = order.shopping_mall_order_sellers.find(
    (os) =>
      os.shopping_mall_seller_id === props.seller.id && os.deleted_at === null,
  );

  if (!sellerAssociation) {
    throw new HttpException("You do not have access to this order", 403);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const [histories, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_status_histories.findMany({
      where: {
        shopping_mall_order_id: props.orderId,
        ...(props.body.status && { new_status: props.body.status }),
        ...((props.body.from_date || props.body.to_date) && {
          created_at: {
            ...(props.body.from_date && {
              gte: new Date(props.body.from_date),
            }),
            ...(props.body.to_date && { lte: new Date(props.body.to_date) }),
          },
        }),
      },
      orderBy:
        props.body.sort_by === "status"
          ? { new_status: props.body.order ?? "desc" }
          : { created_at: props.body.order ?? "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_status_histories.count({
      where: {
        shopping_mall_order_id: props.orderId,
        ...(props.body.status && { new_status: props.body.status }),
        ...((props.body.from_date || props.body.to_date) && {
          created_at: {
            ...(props.body.from_date && {
              gte: new Date(props.body.from_date),
            }),
            ...(props.body.to_date && { lte: new Date(props.body.to_date) }),
          },
        }),
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: histories.map((h) => ({
      id: h.id,
      shopping_mall_order_id: h.shopping_mall_order_id,
      shopping_mall_order_seller_id:
        h.shopping_mall_order_seller_id ?? undefined,
      previous_status: h.previous_status ?? undefined,
      new_status: h.new_status,
      actor_type: h.actor_type,
      actor_id: h.actor_id ?? undefined,
      change_reason: h.change_reason ?? undefined,
      ip_address: h.ip_address ?? undefined,
      created_at: toISOStringSafe(h.created_at),
    })),
  };
}
