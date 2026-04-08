import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCancellationRequestTransformer } from "../transformers/EcommerceCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerOrdersOrderIdItemsItemIdCancellationRequestsRequestId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCancellationRequest> {
  // Load the order item to verify it belongs to the specified order
  const orderItem = await MyGlobal.prisma.ecommerce_order_items.findUnique({
    where: { id: props.itemId },
    select: { ecommerce_order_id: true, ecommerce_seller_id: true },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.ecommerce_order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      404,
    );
  }
  // Load the cancellation request with order item relation
  const record =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findFirst({
      ...EcommerceCancellationRequestTransformer.select(),
      where: {
        id: props.requestId,
        ecommerce_order_item_id: props.itemId,
      },
    });
  if (!record) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // Authorization check - customer must own the order
  const order = await MyGlobal.prisma.ecommerce_orders.findUnique({
    where: { id: props.orderId },
    select: { ecommerce_customer_id: true },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  if (order.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceCancellationRequestTransformer.transform(record);
}
