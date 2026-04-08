import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
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
import { EcommerceRefundRequestTransformer } from "../transformers/EcommerceRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerOrdersOrderIdItemsItemIdRefundRequestsRequestId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceRefundRequest> {
  // Validate order exists and belongs to customer
  const order = await MyGlobal.prisma.ecommerce_orders.findFirst({
    where: {
      id: props.orderId,
      ecommerce_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }
  // Validate order item exists and belongs to the order
  const orderItem = await MyGlobal.prisma.ecommerce_order_items.findFirst({
    where: {
      id: props.itemId,
      ecommerce_order_id: props.orderId,
      deleted_at: null,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // Query refund request with row-level security
  const record =
    await MyGlobal.prisma.ecommerce_refund_requests.findFirstOrThrow({
      where: {
        id: props.requestId,
        ecommerce_order_item_id: props.itemId,
        deleted_at: null,
      },
      ...EcommerceRefundRequestTransformer.select(),
    });
  return await EcommerceRefundRequestTransformer.transform(record);
}
