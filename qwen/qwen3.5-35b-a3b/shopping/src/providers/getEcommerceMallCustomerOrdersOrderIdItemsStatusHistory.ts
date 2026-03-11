import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function getEcommerceMallCustomerOrdersOrderIdItemsStatusHistory(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrder.IItemStatusHistory[]> {
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirst({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      ecommerce_mall_order_id: props.orderId,
      deleted_at: null,
    },
    orderBy: {
      created_at: "asc",
    },
  });
  const results: IEcommerceMallOrder.IItemStatusHistory[] =
    await ArrayUtil.asyncMap(orderItems, async (item) => {
      const snapshots =
        await MyGlobal.prisma.ecommerce_mall_snapshot_audits.findMany({
          where: {
            record_type: "order_item",
            record_id: item.id,
          },
          orderBy: {
            changed_at: "asc",
          },
        });
      const statusHistory: IEcommerceMallOrder.IStatusHistoryEntry[] =
        snapshots.map((snapshot) => {
          const oldValues = JSON.parse(snapshot.old_values);
          const newValues = JSON.parse(snapshot.new_values);
          const oldStatus = oldValues?.item_status;
          const newStatus = newValues?.item_status;
          return {
            oldStatus: oldStatus === undefined ? null : oldStatus,
            newStatus: newStatus ?? null,
            changedAt: toISOStringSafe(snapshot.changed_at),
            changedBy: snapshot.changed_by,
          };
        });
      const productSnapshot = JSON.parse(
        item.product_snapshot,
      ) as IEcommerceMallProduct.ISummary;
      const variantSnapshot = JSON.parse(
        item.variant_snapshot,
      ) as IEcommerceMallProductVariant.ISummary;
      const sellerSnapshot = JSON.parse(
        item.seller_profile_snapshot,
      ) as IEcommerceMallSeller.ISummary;
      return {
        id: item.id,
        product: productSnapshot,
        variant: variantSnapshot,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        itemStatus: typia.assert<
          "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
        >(item.item_status),
        statusHistory,
        createdAt: toISOStringSafe(item.created_at),
        updatedAt: toISOStringSafe(item.updated_at),
      };
    });
  return results;
}
