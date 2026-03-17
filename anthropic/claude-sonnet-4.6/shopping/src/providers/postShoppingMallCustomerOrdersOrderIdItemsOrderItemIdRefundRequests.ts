import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallRefundRequestCollector } from "../collectors/ShoppingMallRefundRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrdersOrderIdItemsOrderItemIdRefundRequests(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.ICreate;
}): Promise<IShoppingMallRefundRequest> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // 1. Verify order exists and belongs to the authenticated customer
    const order = await tx.shopping_mall_orders.findUniqueOrThrow({
      where: { id: props.orderId },
      select: { id: true, shopping_mall_customer_id: true },
    });
    if (order.shopping_mall_customer_id !== props.customer.id) {
      throw new HttpException(
        "Forbidden: this order does not belong to you",
        403,
      );
    }
    // 2. Verify the order item belongs to this order
    const orderItem = await tx.shopping_mall_order_items.findFirstOrThrow({
      where: {
        id: props.orderItemId,
        shopping_mall_order_id: props.orderId,
      },
      select: { id: true, status: true, updated_at: true },
    });
    // 3. Check order item status is 'delivered'
    if (orderItem.status !== "delivered") {
      throw new HttpException(
        `Unprocessable: order item status is '${orderItem.status}', only 'delivered' items are eligible for refund`,
        422,
      );
    }
    // 4. Check 7-day eligibility window from delivery (updated_at as delivery timestamp)
    const deliveredAt = orderItem.updated_at.getTime();
    const nowMs = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (nowMs - deliveredAt > sevenDaysMs) {
      throw new HttpException(
        "Unprocessable: the 7-day refund eligibility window has expired",
        422,
      );
    }
    // 5. Check no existing refund request for this order item
    const existing = await tx.shopping_mall_refund_requests.findUnique({
      where: { order_item_id: props.orderItemId },
      select: { id: true },
    });
    if (existing !== null) {
      throw new HttpException(
        "Conflict: a refund request already exists for this order item",
        409,
      );
    }
    // 6. Create the refund request using the Collector + Transformer
    const created = await tx.shopping_mall_refund_requests.create({
      data: await ShoppingMallRefundRequestCollector.collect({
        body: props.body,
        shoppingMallOrderItems: { id: props.orderItemId },
        shoppingMallCustomers: { id: props.customer.id },
        shoppingMallCustomerSessions: { id: props.customer.session_id },
      }),
      ...ShoppingMallRefundRequestTransformer.select(),
    });
    // 7. Transform and return
    return ShoppingMallRefundRequestTransformer.transform(created);
  });
}
