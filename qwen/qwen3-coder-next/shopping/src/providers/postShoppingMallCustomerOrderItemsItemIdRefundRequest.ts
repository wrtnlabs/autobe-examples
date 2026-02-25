import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
import { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallOrderRefundRequestCollector } from "../collectors/ShoppingMallOrderRefundRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderRefundRequestTransformer } from "../transformers/ShoppingMallOrderRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrderItemsItemIdRefundRequest(props: {
  customer: CustomerPayload;
  itemId: string;
  body: IShoppingMallOrderRefundRequest.ICreate;
}): Promise<IShoppingMallOrderRefundRequest> {
  // Validate order item exists and belongs to customer
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        item_status: true,
        created_at: true,
        shopping_mall_order_id: true,
      },
    });
  // Verify ownership - get customer ID from the order relation
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: orderItem.shopping_mall_order_id },
    select: { shopping_mall_customer_id: true },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate status is 'delivered'
  if (orderItem.item_status !== "delivered") {
    throw new HttpException("Item is not delivered yet", 400);
  }
  // Check for existing pending or processed refunds
  const existingRefund =
    await MyGlobal.prisma.shopping_mall_order_refund_requests.findFirst({
      where: {
        shopping_mall_order_item_id: props.itemId,
        status: { in: ["pending", "approved", "rejected"] },
      },
    });
  if (existingRefund !== null) {
    throw new HttpException(
      "A refund request for this item already exists",
      400,
    );
  }
  // Get customer session for refund request
  const customerSession =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findFirstOrThrow({
      where: {
        shopping_mall_customer_id: props.customer.id,
        id: props.customer.session_id,
      },
    });
  // Create refund request using collector
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_order_refund_requests.create({
      data: await ShoppingMallOrderRefundRequestCollector.collect({
        body: props.body,
        shoppingMallOrderItem: orderItem,
        shoppingMallCustomer: { id: props.customer.id },
        shoppingMallCustomerSession: { id: customerSession.id },
      }),
      ...ShoppingMallOrderRefundRequestTransformer.select(),
    });
  // Transform and return
  return await ShoppingMallOrderRefundRequestTransformer.transform(
    refundRequest,
  );
}
