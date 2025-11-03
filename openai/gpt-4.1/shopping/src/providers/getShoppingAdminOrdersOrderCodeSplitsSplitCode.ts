import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrderSplit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderSplit";
import { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminOrdersOrderCodeSplitsSplitCode(props: {
  admin: AdminPayload;
  orderCode: string;
  splitCode: string;
}): Promise<IShoppingOrderSplit> {
  // Find the parent order by order_code (not deleted)
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: props.orderCode,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!order) {
    throw new HttpException("Order not found.", 404);
  }

  // Find the split by order_id + split_code (not deleted)
  const split = await MyGlobal.prisma.shopping_order_splits.findFirst({
    where: {
      shopping_order_id: order.id,
      split_code: props.splitCode,
      deleted_at: null,
    },
    select: {
      id: true,
      split_code: true,
      subtotal_price: true,
      status: true,
      created_at: true,
      updated_at: true,
      shopping_order_id: true,
      shopping_seller_id: true,
    },
  });
  if (!split) {
    throw new HttpException("Order split not found.", 404);
  }

  // Find the seller (must not be deleted)
  const seller = await MyGlobal.prisma.shopping_sellers.findFirst({
    where: {
      id: split.shopping_seller_id,
      deleted_at: null,
    },
    select: {
      id: true,
      display_name: true,
      status: true,
    },
  });
  if (!seller) {
    throw new HttpException("Seller not found.", 404);
  }

  // Find all status histories for this split (not deleted)
  const statusHistoriesRaw =
    await MyGlobal.prisma.shopping_order_status_histories.findMany({
      where: {
        shopping_order_split_id: split.id,
      },
      orderBy: { occurred_at: "asc" },
      select: {
        id: true,
        from_status: true,
        to_status: true,
        triggered_by: true,
        event_note: true,
        occurred_at: true,
      },
    });
  const order_status_histories =
    statusHistoriesRaw.length > 0
      ? statusHistoriesRaw.map((h) => ({
          id: h.id,
          from_status: h.from_status,
          to_status: h.to_status,
          triggered_by: h.triggered_by,
          event_note: h.event_note ?? undefined,
          occurred_at: toISOStringSafe(h.occurred_at),
        }))
      : undefined;

  return {
    id: split.id,
    split_code: split.split_code,
    subtotal_price: split.subtotal_price,
    status: split.status,
    created_at: toISOStringSafe(split.created_at),
    updated_at: split.updated_at
      ? toISOStringSafe(split.updated_at)
      : undefined,
    order_id: split.shopping_order_id,
    seller: {
      id: seller.id,
      display_name: seller.display_name,
      status: seller.status,
    },
    order_status_histories: order_status_histories,
  };
}
