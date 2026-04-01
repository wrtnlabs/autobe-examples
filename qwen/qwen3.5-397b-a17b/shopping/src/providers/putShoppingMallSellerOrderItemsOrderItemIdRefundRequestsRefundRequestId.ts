import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function putShoppingMallSellerOrderItemsOrderItemIdRefundRequestsRefundRequestId(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<IShoppingMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        status: true,
        order_item_id: true,
        reason: true,
        response_reason: true,
        requested_at: true,
        responded_at: true,
        customer_id: true,
        seller_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (refundRequest.status !== "pending") {
    throw new HttpException(
      "Refund request has already been responded to",
      400,
    );
  }
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        productVariant: {
          select: {
            id: true,
          },
        },
        quantity: true,
        status: true,
      },
    });
  if (orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (refundRequest.order_item_id !== props.orderItemId) {
    throw new HttpException(
      "Refund request does not match the order item",
      400,
    );
  }
  await MyGlobal.prisma.shopping_mall_refund_request_snapshots.create({
    data: {
      id: v4(),
      refundRequest: { connect: { id: refundRequest.id } },
      reason: refundRequest.reason,
      status: refundRequest.status,
      seller_response: refundRequest.response_reason,
      responded_at: refundRequest.responded_at,
      created_at: new Date(),
    },
  });
  await MyGlobal.prisma.shopping_mall_refund_requests.update({
    where: { id: props.refundRequestId },
    data: {
      status: props.body.status,
      response_reason: props.body.response_reason ?? null,
      seller_id: props.seller.id,
      responded_at: new Date(),
    },
  });
  if (props.body.status === "approved") {
    await MyGlobal.prisma.shopping_mall_order_items.update({
      where: { id: props.orderItemId },
      data: {
        status: "refunded",
      },
    });
    const variant =
      await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
        where: { id: orderItem.productVariant.id },
        select: { id: true },
      });
    await MyGlobal.prisma.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        product_variant_id: variant.id,
        quantity_change: orderItem.quantity,
        reason: "refund",
        created_at: new Date(),
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
