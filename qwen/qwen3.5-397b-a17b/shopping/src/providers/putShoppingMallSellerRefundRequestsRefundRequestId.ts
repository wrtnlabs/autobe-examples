import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerRefundRequestsRefundRequestId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<IShoppingMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        status: true,
        reason: true,
        customer_id: true,
        delivered_at: true,
        requested_at: true,
        orderItem: {
          select: {
            id: true,
            shopping_mall_seller_id: true,
            shopping_mall_product_variant_id: true,
          },
        },
      },
    });
  if (refundRequest.status !== "PENDING") {
    throw new HttpException("Refund request is not in PENDING status", 400);
  }
  if (refundRequest.orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "Forbidden: Not the seller of this order item",
      403,
    );
  }
  if (
    !props.body.status ||
    (props.body.status !== "APPROVED" && props.body.status !== "REJECTED")
  ) {
    throw new HttpException("Status must be either APPROVED or REJECTED", 400);
  }
  const now = new Date();
  await MyGlobal.prisma.shopping_mall_refund_requests.update({
    where: { id: props.refundRequestId },
    data: {
      status: props.body.status,
      responded_by_seller_id: props.seller.id,
      responded_at: now,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.shopping_mall_refund_request_snapshots.create({
    data: {
      id: v4(),
      refundRequest: { connect: { id: props.refundRequestId } },
      orderItem: { connect: { id: refundRequest.orderItem.id } },
      customer: { connect: { id: refundRequest.customer_id } },
      status: props.body.status,
      reason: refundRequest.reason,
      delivered_at: refundRequest.delivered_at,
      requested_at: refundRequest.requested_at,
      responded_at: now,
      respondedBySeller: { connect: { id: props.seller.id } },
      snapshot_at: now,
      created_at: now,
    },
  });
  if (props.body.status === "APPROVED") {
    await MyGlobal.prisma.shopping_mall_order_items.update({
      where: { id: refundRequest.orderItem.id },
      data: {
        status: "REFUNDED",
        updated_at: now,
      },
    });
    await MyGlobal.prisma.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        variant: {
          connect: {
            id: refundRequest.orderItem.shopping_mall_product_variant_id,
          },
        },
        quantity_change: 1,
        reason: "REFUND",
        created_at: now,
      },
    });
  }
  const updated =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      ...ShoppingMallRefundRequestTransformer.select(),
    });
  return await ShoppingMallRefundRequestTransformer.transform(updated);
}
