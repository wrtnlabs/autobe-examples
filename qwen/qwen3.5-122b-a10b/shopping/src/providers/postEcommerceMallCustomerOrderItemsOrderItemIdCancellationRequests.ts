import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemCancellationRequest";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallOrderItemCancellationRequestCollector } from "../collectors/EcommerceMallOrderItemCancellationRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemCancellationRequestTransformer } from "../transformers/EcommerceMallOrderItemCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerOrderItemsOrderItemIdCancellationRequests(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItemCancellationRequest.ICreate;
}): Promise<IEcommerceMallOrderItemCancellationRequest> {
  // 1. Verify order item exists and belongs to customer
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      deleted_at: null,
      order: {
        ecommerce_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (!orderItem) {
    throw new HttpException(
      "Order item not found or does not belong to you",
      404,
    );
  }
  // 2. Verify customer account is active
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: {
      id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!customer || customer.account_status !== "active") {
    throw new HttpException("Customer account is not active", 403);
  }
  // 3. Verify order item status is 'paid' (eligible for cancellation)
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Order item is not eligible for cancellation. Only items with 'paid' status can be cancelled.",
      422,
    );
  }
  // 4. Check no existing cancellation request exists
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.findFirst(
      {
        where: {
          order_item_id: props.orderItemId,
          deleted_at: null,
        },
      },
    );
  if (existingRequest) {
    throw new HttpException(
      "A cancellation request already exists for this order item",
      409,
    );
  }
  // 5. Create cancellation request using collector
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.create(
      {
        data: await EcommerceMallOrderItemCancellationRequestCollector.collect({
          body: props.body,
          ecommerceMallOrderItems: orderItem,
        }),
        ...EcommerceMallOrderItemCancellationRequestTransformer.select(),
      },
    );
  // 6. Transform and return
  return await EcommerceMallOrderItemCancellationRequestTransformer.transform(
    cancellationRequest,
  );
}
