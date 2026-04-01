import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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
  // Fetch refund request with order item to verify seller ownership
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: {
        id: props.refundRequestId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        reason: true,
        shopping_mall_order_item_id: true,
        orderItem: {
          select: {
            id: true,
            shopping_mall_seller_id: true,
          },
        },
      },
    });
  // Validate status is pending
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request is not in pending status", 409);
  }
  // Validate seller owns the order item
  if (refundRequest.orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Create refund snapshot before updating
  await MyGlobal.prisma.shopping_mall_refund_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_refund_request_id: props.refundRequestId,
      snapshot_data: JSON.stringify({
        reason: refundRequest.reason,
        status_before: "pending",
        status_after: props.body.status,
        responded_at: new Date().toISOString(),
      }),
      created_at: new Date(),
    },
  });
  // Update refund request
  const updatedRefundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.update({
      where: {
        id: props.refundRequestId,
      },
      data: {
        status: props.body.status,
        responded_at: new Date(),
        updated_at: new Date(),
      },
      ...ShoppingMallRefundRequestTransformer.select(),
    });
  // If approved, update order item status to refunded
  if (props.body.status === "approved") {
    await MyGlobal.prisma.shopping_mall_order_items.update({
      where: {
        id: refundRequest.shopping_mall_order_item_id,
      },
      data: {
        status: "refunded",
        updated_at: new Date(),
      },
    });
  }
  return await ShoppingMallRefundRequestTransformer.transform(
    updatedRefundRequest,
  );
}
