import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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

export async function postShoppingMallSellerRefundRequestsRefundRequestIdApprove(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
    });
  if (refundRequest.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request status is not pending", 400);
  }
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: refundRequest.shopping_mall_order_item_id },
    });
  if (orderItem.status !== "delivered") {
    throw new HttpException("Order item is not delivered, cannot refund", 400);
  }
  // Calculate the date difference in a safe string-based manner
  const deliveredAt = toISOStringSafe(orderItem.updated_at);
  const nowStr = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  const deliveredDate = new Date(deliveredAt);
  const nowDate = new Date(nowStr);
  const sevenDaysMilliseconds = 7 * 24 * 60 * 60 * 1000;
  if (nowDate.getTime() - deliveredDate.getTime() > sevenDaysMilliseconds) {
    throw new HttpException(
      "Refund request expired - must be within 7 days of delivery",
      400,
    );
  }
  const approvalTime: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const updatedRefundRequest = await MyGlobal.prisma.$transaction(
    async (tx) => {
      await tx.shopping_mall_refund_requests.update({
        where: { id: props.refundRequestId },
        data: {
          status: "approved",
          responded_at: approvalTime,
          updated_at: approvalTime,
        },
      });
      await tx.shopping_mall_refund_request_snapshots.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          shopping_mall_refund_request_id: props.refundRequestId,
          status: "approved",
          reason: "",
          created_at: approvalTime,
          updated_at: approvalTime,
          deleted_at: null,
        },
      });
      await tx.shopping_mall_order_items.update({
        where: { id: refundRequest.shopping_mall_order_item_id },
        data: {
          status: "refunded",
          updated_at: approvalTime,
        },
      });
      const productVariant =
        await tx.shopping_mall_product_variants.findUniqueOrThrow({
          where: { id: orderItem.shopping_mall_product_variant_id },
          select: { stock_quantity: true },
        });
      await tx.shopping_mall_product_variants.update({
        where: { id: orderItem.shopping_mall_product_variant_id },
        data: {
          stock_quantity: productVariant.stock_quantity + orderItem.quantity,
          updated_at: approvalTime,
        },
      });
      return await tx.shopping_mall_refund_requests.findUniqueOrThrow({
        where: { id: props.refundRequestId },
        ...ShoppingMallRefundRequestTransformer.select(),
      });
    },
  );
  return await ShoppingMallRefundRequestTransformer.transform(
    updatedRefundRequest,
  );
}
