import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // Validate order item exists and belongs to authenticated customer
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.body.orderItemId,
      order: {
        customer: {
          id: props.customer.id,
        },
      },
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // Verify order item status is 'paid' (not yet shipped)
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Order item cannot be cancelled - must be in 'paid' status",
      422,
    );
  }
  // Check for existing pending cancellation request
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirst({
      where: {
        order_item_id: props.body.orderItemId,
        customer_id: props.customer.id,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "A pending cancellation request already exists for this order item",
      409,
    );
  }
  // Create cancellation request using Collector
  const created =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.create({
      data: await EcommerceMallCancellationRequestCollector.collect({
        body: props.body,
        customer: { id: props.customer.id },
      }),
      ...EcommerceMallCancellationRequestTransformer.select(),
    });
  // Transform and return
  return await EcommerceMallCancellationRequestTransformer.transform(created);
}
