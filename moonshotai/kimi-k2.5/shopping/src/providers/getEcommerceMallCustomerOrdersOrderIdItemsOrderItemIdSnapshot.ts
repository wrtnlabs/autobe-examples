import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
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
import { EcommerceMallOrderItemSnapshotTransformer } from "../transformers/EcommerceMallOrderItemSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrdersOrderIdItemsOrderItemIdSnapshot(props: {
  customer: CustomerPayload;
  orderId: string;
  orderItemId: string;
}): Promise<IEcommerceMallOrderItemSnapshot> {
  // Verify order exists and belongs to customer
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUnique({
    where: { id: props.orderId },
    select: { id: true, customer_id: true },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify orderItem exists and belongs to this order
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findUnique(
    {
      where: { id: props.orderItemId },
      select: { id: true, order_id: true },
    },
  );
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.order_id !== props.orderId) {
    throw new HttpException("Order item does not belong to this order", 403);
  }
  // Retrieve snapshot using transformer select and transform
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.findUnique({
      where: { order_item_id: props.orderItemId },
      ...EcommerceMallOrderItemSnapshotTransformer.select(),
    });
  if (!snapshot) {
    throw new HttpException("Snapshot not found", 404);
  }
  return await EcommerceMallOrderItemSnapshotTransformer.transform(snapshot);
}
