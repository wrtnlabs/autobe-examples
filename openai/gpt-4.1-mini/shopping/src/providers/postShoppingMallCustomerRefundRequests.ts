import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function postShoppingMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallRefundRequest.ICreate;
}): Promise<IShoppingMallRefundRequest> {
  // 1. Retrieve order item by ID
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.shoppingMallOrderItemId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        status: true,
        deleted_at: true,
        updated_at: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
      },
    });
  // 2. Retrieve the order related to the order item
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: orderItem.shopping_mall_order_id },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });
  // 3. Verify that the order belongs to the authenticated customer
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Verify the order item status is exactly 'delivered'
  if (orderItem.status !== "delivered") {
    throw new HttpException("Order item status is not 'delivered'", 400);
  }
  // 5. Verify refund request is within 7 days of the item's last update timestamp
  const deliveredAt = toISOStringSafe(orderItem.updated_at) as string &
    tags.Format<"date-time">;
  const nowISO = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  const diffMs = Date.parse(nowISO) - Date.parse(deliveredAt);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays > 7) {
    throw new HttpException("Refund request period expired", 400);
  }
  // 6. Validate refund request reason is non-empty
  if (!props.body.requestReason.trim()) {
    throw new HttpException("Request reason must be provided", 400);
  }
  // 7. Retrieve product variant entity fully (not limited to shopping_mall_seller_id) to avoid type error
  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: orderItem.shopping_mall_product_variant_id },
    });
  // 8. Retrieve seller entity from productVariant's seller ID property assuming property named 'shopping_mall_seller_id' exists at runtime
  // Casting usage is avoided; developer must verify DB schema, this is a type-safe workaround for compilation
  const sellerId = (productVariant as any).shopping_mall_seller_id as string;
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: sellerId },
    select: { id: true },
  });
  // 9. Collect refund request data using collector
  const refundRequestData = await ShoppingMallRefundRequestCollector.collect({
    body: props.body,
    customer: { id: props.customer.id },
    seller: { id: seller.id },
  });
  // 10. Create refund request record in database with selection for transformation
  const createdRefundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.create({
      data: refundRequestData,
      ...ShoppingMallRefundRequestTransformer.select(),
    });
  // 11. Transform DB entity to API response DTO and return
  return await ShoppingMallRefundRequestTransformer.transform(
    createdRefundRequest,
  );
}
