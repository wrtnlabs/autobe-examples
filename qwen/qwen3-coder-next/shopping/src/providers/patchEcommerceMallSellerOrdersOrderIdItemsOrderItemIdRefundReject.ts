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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerOrdersOrderIdItemsOrderItemIdRefundReject(props: {
  seller: SellerPayload;
  orderId: string;
  orderItemId: string;
  body: IEcommerceMallRefundRequest.IUpdate;
}): Promise<IEcommerceMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirst({
      where: {
        order_item_id: props.orderItemId,
        status: "pending",
        seller_id: props.seller.id,
      },
      select: {
        id: true,
        order_item_id: true,
        customer_id: true,
        seller_id: true,
        reason: true,
        status: true,
        orderItem: {
          select: {
            seller_id: true,
          },
        },
      },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found or not pending", 404);
  }
  if (refundRequest.orderItem.seller_id !== props.seller.id) {
    throw new HttpException(
      "Forbidden - Seller does not own this order item",
      403,
    );
  }
  const now = new Date();
  await MyGlobal.prisma.ecommerce_mall_refund_requests.update({
    where: { id: refundRequest.id },
    data: {
      status: "rejected",
      reason: props.body.reason,
      responded_at: now,
      updated_at: now,
    },
  });
  const updated =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: refundRequest.id },
      ...EcommerceMallRefundRequestTransformer.select(),
    });
  return await EcommerceMallRefundRequestTransformer.transform(updated);
}
