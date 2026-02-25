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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceRefundRequestTransformer } from "../transformers/EcommerceRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerOrdersOrderIdRefundRequestsRefundRequestId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      ...EcommerceRefundRequestTransformer.select(),
    });
  if (refundRequest.deleted_at !== null) {
    throw new HttpException("Refund request not found", 404);
  }
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
      where: { id: refundRequest.orderItem.id },
    });
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Refund requests only allowed for delivered items",
      400,
    );
  }
  if (orderItem.order_id !== props.orderId) {
    throw new HttpException("Order ID mismatch", 404);
  }
  if (refundRequest.customer.id !== props.customer.id) {
    throw new HttpException("Unauthorized access", 403);
  }
  return await EcommerceRefundRequestTransformer.transform(refundRequest);
}
