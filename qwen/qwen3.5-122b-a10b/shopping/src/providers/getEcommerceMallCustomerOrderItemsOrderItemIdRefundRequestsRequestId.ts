import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallOrderItemRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemRefundRequest";
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
import { EcommerceMallOrderItemRefundRequestTransformer } from "../transformers/EcommerceMallOrderItemRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrderItemsOrderItemIdRefundRequestsRequestId(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrderItemRefundRequest> {
  // Query the refund request with order item relation
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_order_item_refund_requests.findFirst({
      where: {
        id: props.requestId,
        ecommerce_mall_order_item_id: props.orderItemId,
        deleted_at: null,
      },
      ...EcommerceMallOrderItemRefundRequestTransformer.select(),
    });
  // Return 404 if not found
  if (refundRequest === null) {
    throw new HttpException("Refund request not found", 404);
  }
  // Authorization check: verify the order item belongs to the customer's order
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      order: {
        ecommerce_mall_customer_id: props.customer.id,
      },
    },
    select: {
      id: true,
    },
  });
  // Return 403 if customer doesn't own this order item
  if (orderItem === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform and return using transformer
  return await EcommerceMallOrderItemRefundRequestTransformer.transform(
    refundRequest,
  );
}
