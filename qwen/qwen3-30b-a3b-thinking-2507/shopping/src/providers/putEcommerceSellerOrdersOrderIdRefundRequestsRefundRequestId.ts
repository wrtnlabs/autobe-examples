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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceCustomerAtSummaryTransformer } from "../transformers/EcommerceCustomerAtSummaryTransformer";
import { EcommerceOrderItemAtSummaryTransformer } from "../transformers/EcommerceOrderItemAtSummaryTransformer";
import { EcommerceRefundRequestTransformer } from "../transformers/EcommerceRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceSellerOrdersOrderIdRefundRequestsRefundRequestId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceRefundRequest.IUpdate;
}): Promise<IEcommerceRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.findUniqueOrThrow({
      where: {
        id: props.refundRequestId,
        deleted_at: null,
      },
      include: {
        orderItem: EcommerceOrderItemAtSummaryTransformer.select(),
        customer: EcommerceCustomerAtSummaryTransformer.select(),
      },
    });
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request must be in pending status", 400);
  }
  if (refundRequest.orderItem.status !== "delivered") {
    throw new HttpException(
      "Order item must be delivered to process refund",
      400,
    );
  }
  const deliveryDate = new Date(refundRequest.orderItem.created_at);
  const daysSinceDelivery =
    (new Date().getTime() - deliveryDate.getTime()) / (1000 * 3600 * 24);
  if (daysSinceDelivery > 7) {
    throw new HttpException(
      "Refund requests must be processed within 7 days of delivery",
      400,
    );
  }
  const updatedRefundRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.update({
      where: { id: props.refundRequestId },
      data: {
        status: props.body.status,
        updated_at: new Date(),
      },
    });
  const fullRefundRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.findUniqueOrThrow({
      where: { id: updatedRefundRequest.id },
      include: {
        orderItem: EcommerceOrderItemAtSummaryTransformer.select(),
        customer: EcommerceCustomerAtSummaryTransformer.select(),
      },
    });
  if (props.body.status === "approved") {
    const variantId = refundRequest.orderItem.variant.id;
    const productId = refundRequest.orderItem.variant.product.id;
    const quantity = refundRequest.orderItem.quantity;
    await MyGlobal.prisma.ecommerce_variant_inventories.updateMany({
      where: {
        variant: { id: variantId },
      },
      data: {
        quantity: { increment: quantity },
      },
    });
  }
  return await EcommerceRefundRequestTransformer.transform(fullRefundRequest);
}
