import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallRefundRequestCollector } from "../collectors/EcommerceMallRefundRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallRefundRequest.ICreate;
}): Promise<IEcommerceMallRefundRequest> {
  // Look up the order item with its order to verify ownership and status
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findUnique(
    {
      where: { id: props.body.orderItemId },
      select: {
        id: true,
        status: true,
        seller_id: true,
        order: {
          select: {
            id: true,
            customer_id: true,
          },
        },
      },
    },
  );
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // Verify order item is delivered
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Order item must be delivered to request a refund",
      422,
    );
  }
  // Verify customer owns the order
  if (orderItem.order.customer_id !== props.customer.id) {
    throw new HttpException(
      "You can only request refunds for your own orders",
      403,
    );
  }
  // Check for existing pending refund request
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirst({
      where: {
        order_item_id: props.body.orderItemId,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "A pending refund request already exists for this order item",
      409,
    );
  }
  // Get seller for the collector
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
    where: { id: orderItem.seller_id },
    select: { id: true },
  });
  if (seller === null) {
    throw new HttpException("Seller not found", 404);
  }
  // Create the refund request using the Collector
  const created = await MyGlobal.prisma.ecommerce_mall_refund_requests.create({
    data: await EcommerceMallRefundRequestCollector.collect({
      body: props.body,
      customer: { id: props.customer.id },
      seller: { id: seller.id },
      orderItem: { id: orderItem.id },
    }),
    ...EcommerceMallRefundRequestTransformer.select(),
  });
  // Transform and return the result
  return await EcommerceMallRefundRequestTransformer.transform(created);
}
