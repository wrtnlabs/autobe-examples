import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
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

export async function patchEcommerceMallCustomerOrdersOrderIdItemsOrderItemIdRefund(props: {
  customer: CustomerPayload;
  orderId: string;
  orderItemId: string;
  body: IEcommerceMallRefundRequest.ICreate;
}): Promise<IEcommerceMallRefundRequest> {
  // Validate ownership and status
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      include: {
        order: {
          select: {
            customer_id: true,
          },
        },
        seller: true,
      },
    });
  if (orderItem.order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (orderItem.item_status !== "delivered") {
    throw new HttpException(
      `Cannot refund item with status '${orderItem.item_status}'`,
      400,
    );
  }
  // Validate 7-day delivery window
  const now = new Date();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const diff = now.getTime() - orderItem.created_at.getTime();
  if (diff > sevenDays) {
    throw new HttpException("Refund window exceeded (7 days)", 400);
  }
  // Create refund request using collector
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.create({
      data: await EcommerceMallRefundRequestCollector.collect({
        body: props.body,
        ecommerceMallOrderItems: { id: props.orderItemId },
        ecommerceMallCustomers: { id: props.customer.id },
        ecommerceMallSellers: { id: orderItem.seller_id },
      }),
      ...EcommerceMallRefundRequestTransformer.select(),
    });
  return await EcommerceMallRefundRequestTransformer.transform(refundRequest);
}
