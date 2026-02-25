import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceCancellationRequestCollector } from "../collectors/EcommerceCancellationRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCancellationRequestTransformer } from "../transformers/EcommerceCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceCancellationRequest.ICreate;
}): Promise<IEcommerceCancellationRequest> {
  // 1. Fetch order item with seller info for validation
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
      where: { id: props.body.ecommerce_order_item_id },
      select: {
        id: true,
        status: true,
        seller_id: true,
        product_variant_id: true,
      },
    });
  // 2. Validate ownership (customer must be original purchaser)
  // Use the seller_id from the order item directly
  const sellerId = orderItem.seller_id;
  if (!sellerId) {
    throw new HttpException("Seller not found for this order item", 404);
  }
  // 3. Validate status (must be 'paid' with no shipment created)
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Cancellation can only be requested for paid order items before shipment",
      400,
    );
  }
  // 4. Check for existing cancellation request (unique constraint on order_item_id)
  const existingRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findFirst({
      where: { ecommerce_order_item_id: props.body.ecommerce_order_item_id },
    });
  if (existingRequest) {
    throw new HttpException(
      "A cancellation request already exists for this order item",
      409,
    );
  }
  // 5. Use Collector to prepare create data
  const dataInput = await EcommerceCancellationRequestCollector.collect({
    body: props.body,
    ecommerceCustomers: { id: props.customer.id } satisfies IEntity,
    ecommerceSellers: { id: sellerId } satisfies IEntity,
  });
  // 6. Create cancellation request with Transformer for response
  const created = await MyGlobal.prisma.ecommerce_cancellation_requests.create({
    data: dataInput,
    ...EcommerceCancellationRequestTransformer.select(),
  });
  // 7. Return complete response using Transformer
  return await EcommerceCancellationRequestTransformer.transform(created);
}
