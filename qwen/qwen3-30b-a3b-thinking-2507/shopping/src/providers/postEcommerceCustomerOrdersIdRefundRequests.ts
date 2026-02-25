import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceRefundRequestCollector } from "../collectors/EcommerceRefundRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceRefundRequestTransformer } from "../transformers/EcommerceRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceCustomerOrdersIdRefundRequests(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
  body: IEcommerceRefundRequest.ICreate;
}): Promise<IEcommerceRefundRequest> {
  const orderItem = await MyGlobal.prisma.ecommerce_order_items.findUnique({
    where: { id: props.id },
    select: { status: true, deleted_at: true },
  });
  if (!orderItem || orderItem.status !== "delivered") {
    throw new HttpException("Order item not found or not delivered", 400);
  }
  if (!orderItem.deleted_at) {
    throw new HttpException("Delivery date is missing", 400);
  }
  const deliveryDate = new Date(orderItem.deleted_at);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  if (deliveryDate < sevenDaysAgo) {
    throw new HttpException(
      "Refund request must be made within 7 days of delivery",
      400,
    );
  }
  const refundRequest = await MyGlobal.prisma.ecommerce_refund_requests.create({
    data: {
      ...(await EcommerceRefundRequestCollector.collect({
        body: props.body,
        ecommerceOrderItems: { id: props.id },
        ecommerceCustomers: { id: props.customer.id },
      })),
    },
    ...EcommerceRefundRequestTransformer.select(),
  });
  return await EcommerceRefundRequestTransformer.transform(refundRequest);
}
