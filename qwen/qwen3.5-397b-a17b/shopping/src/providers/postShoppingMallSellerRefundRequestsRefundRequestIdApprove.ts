import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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

export async function postShoppingMallSellerRefundRequestsRefundRequestIdApprove(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirstOrThrow({
      where: {
        id: props.refundRequestId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        reason: true,
        shopping_mall_order_item_id: true,
      },
    });
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request is not pending", 409);
  }
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: refundRequest.shopping_mall_order_item_id },
      select: {
        id: true,
        status: true,
        shopping_mall_seller_id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
      },
    });
  if (orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (orderItem.status !== "delivered") {
    throw new HttpException("Order item is not delivered", 409);
  }
  const now = new Date().toISOString();
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_refund_requests.update({
      where: { id: props.refundRequestId },
      data: {
        status: "approved",
        reviewed_at: now,
        updated_at: now,
      },
    });
    await tx.shopping_mall_order_items.update({
      where: { id: orderItem.id },
      data: {
        status: "refunded",
        updated_at: now,
      },
    });
    await tx.shopping_mall_refund_request_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_refund_request_id: props.refundRequestId,
        status: "approved",
        reason: refundRequest.reason,
        seller_response_type: "approved",
        seller_response_comment: null,
        created_at: now,
      },
    });
    await tx.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        shopping_mall_product_variant_id:
          orderItem.shopping_mall_product_variant_id,
        quantity_delta: orderItem.quantity,
        reason: "refund_approved",
        created_at: now,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      ...ShoppingMallRefundRequestTransformer.select(),
    });
  return await ShoppingMallRefundRequestTransformer.transform(updated);
}
