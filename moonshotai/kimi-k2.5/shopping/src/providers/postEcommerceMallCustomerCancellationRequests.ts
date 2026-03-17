import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCancellationRequestCollector } from "../collectors/EcommerceMallCancellationRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCancellationRequestTransformer } from "../transformers/EcommerceMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCancellationRequest.ICreate;
}): Promise<IEcommerceMallCancellationRequest> {
  // Fetch order item and verify status
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.orderItemId },
      select: {
        id: true,
        order_id: true,
        status: true,
        seller_id: true,
      },
    });
  // Fetch the order to verify ownership
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: orderItem.order_id },
    select: { id: true, customer_id: true },
  });
  // Verify order belongs to authenticated customer
  if (order.customer_id !== props.customer.id) {
    throw new HttpException(
      "Order item does not belong to authenticated customer",
      403,
    );
  }
  // Verify order item status is 'paid' (cancellation only allowed for paid items)
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Cancellation requests can only be created for order items with 'paid' status",
      409,
    );
  }
  // Check for existing pending cancellation request for this order item
  const existingPending =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirst({
      where: {
        order_item_id: props.body.orderItemId,
        status: "pending",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingPending !== null) {
    throw new HttpException(
      "A pending cancellation request already exists for this order item",
      409,
    );
  }
  // Fetch seller to get seller_id for collector
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: orderItem.seller_id },
      select: { id: true },
    },
  );
  // Collect data using the collector
  const createInput = await EcommerceMallCancellationRequestCollector.collect({
    body: props.body,
    customer: { id: props.customer.id },
    seller: { id: seller.id },
  });
  // Create cancellation request with transformer select to load relations
  const created =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.create({
      data: createInput,
      ...EcommerceMallCancellationRequestTransformer.select(),
    });
  // Transform to response DTO
  return await EcommerceMallCancellationRequestTransformer.transform(created);
}
