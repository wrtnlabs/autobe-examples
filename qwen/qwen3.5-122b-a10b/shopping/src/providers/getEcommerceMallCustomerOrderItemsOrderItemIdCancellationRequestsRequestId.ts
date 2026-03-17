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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemCancellationRequestTransformer } from "../transformers/EcommerceMallOrderItemCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrderItemsOrderItemIdCancellationRequestsRequestId(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrderItemCancellationRequest> {
  // Query the cancellation request with soft delete filter
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.findFirst(
      {
        where: {
          id: props.requestId,
          order_item_id: props.orderItemId,
          deleted_at: null,
        },
        ...EcommerceMallOrderItemCancellationRequestTransformer.select(),
      } satisfies Prisma.ecommerce_mall_order_item_cancellation_requestsFindManyArgs,
    );
  // 404 if not found
  if (cancellationRequest === null) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // Authorization check: verify customer owns the order item
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findUnique(
    {
      where: { id: props.orderItemId },
      select: {
        ecommerce_mall_order_id: true,
      },
    } satisfies Prisma.ecommerce_mall_order_itemsFindUniqueArgs,
  );
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // Customer authorization: verify order belongs to this customer
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUnique({
    where: { id: orderItem.ecommerce_mall_order_id },
    select: { ecommerce_mall_customer_id: true },
  } satisfies Prisma.ecommerce_mall_ordersFindUniqueArgs);
  if (order?.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform and return using transformer
  return await EcommerceMallOrderItemCancellationRequestTransformer.transform(
    cancellationRequest,
  );
}
