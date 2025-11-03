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

export async function putShoppingAdminOrdersOrderCodeSplitsSplitCode(props: {
  admin: AdminPayload;
  orderCode: string;
  splitCode: string;
  body: IShoppingOrderSplit.IUpdate;
}): Promise<IShoppingOrderSplit> {
  // 1. Look up parent order by orderCode (must exist and not deleted)
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: { order_code: props.orderCode, deleted_at: null },
    select: { id: true },
  });
  if (!order) throw new HttpException("Order not found", 404);

  // 2. Look up split for this order by splitCode (must exist, not deleted)
  const split = await MyGlobal.prisma.shopping_order_splits.findFirst({
    where: {
      split_code: props.splitCode,
      shopping_order_id: order.id,
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
  if (!split) throw new HttpException("Order split not found", 404);

  // 3. Update split status and updated_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_order_splits.update({
    where: { id: split.id },
    data: {
      status: props.body.status,
      updated_at: now,
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

  // 4. Seller summary (must exist, not soft-deleted)
  const seller = await MyGlobal.prisma.shopping_sellers.findFirst({
    where: { id: updated.shopping_seller_id, deleted_at: null },
    select: { id: true, display_name: true, status: true },
  });
  if (!seller) throw new HttpException("Seller for order split not found", 500);

  // 5. Status change history for this split
  const histories =
    await MyGlobal.prisma.shopping_order_status_histories.findMany({
      where: { shopping_order_split_id: updated.id },
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
    histories.length > 0
      ? histories.map((h) => ({
          id: h.id,
          from_status: h.from_status,
          to_status: h.to_status,
          triggered_by: h.triggered_by,
          event_note: h.event_note ?? undefined,
          occurred_at: toISOStringSafe(h.occurred_at),
        }))
      : undefined;

  // 6. Construct and return IShoppingOrderSplit DTO
  return {
    id: updated.id,
    split_code: updated.split_code,
    subtotal_price: updated.subtotal_price,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: updated.updated_at
      ? toISOStringSafe(updated.updated_at)
      : undefined,
    order_id: updated.shopping_order_id,
    seller: {
      id: seller.id,
      display_name: seller.display_name,
      status: seller.status,
    },
    order_status_histories,
  };
}
