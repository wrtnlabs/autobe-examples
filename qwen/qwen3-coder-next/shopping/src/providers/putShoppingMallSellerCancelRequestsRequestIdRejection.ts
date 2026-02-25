import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerCancelRequestsRequestIdRejection(props: {
  seller: SellerPayload;
  requestId: string;
  body: IShoppingMallOrderCancellationRequest.IUpdate;
}): Promise<IShoppingMallOrderCancellationRequest> {
  const request =
    await MyGlobal.prisma.shopping_mall_order_cancellation_requests.findFirst({
      where: {
        id: props.requestId,
        status: "pending",
      },
      select: {
        id: true,
        order_item_id: true,
        customer_id: true,
        reason: true,
        status: true,
        rejection_reason: true,
        responded_by: true,
        responded_at: true,
        created_at: true,
        deleted_at: true,
        orderItem: {
          select: {
            id: true,
            shopping_mall_order_product_snapshot_id: true,
          },
        },
      },
    });
  if (request === null) {
    throw new HttpException("Cancellation request not found", 404);
  }
  const productSnapshot =
    await MyGlobal.prisma.shopping_mall_order_product_snapshots.findUniqueOrThrow(
      {
        where: {
          id: request.orderItem.shopping_mall_order_product_snapshot_id,
        },
        select: {
          shopping_mall_product_id: true,
        },
      },
    );
  const sellerProduct =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: productSnapshot.shopping_mall_product_id,
      },
      select: {
        shopping_mall_seller_id: true,
      },
    });
  if (sellerProduct.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updatedRequest =
    await MyGlobal.prisma.shopping_mall_order_cancellation_requests.update({
      where: {
        id: props.requestId,
      },
      data: {
        status: "rejected",
        rejection_reason: props.body.rejection_reason,
        responded_by: props.seller.id,
        responded_at: new Date(),
      },
      select: {
        id: true,
        order_item_id: true,
        customer_id: true,
        reason: true,
        status: true,
        rejection_reason: true,
        responded_by: true,
        responded_at: true,
        created_at: true,
        deleted_at: true,
      },
    });
  return {
    id: updatedRequest.id,
    order_item_id: updatedRequest.order_item_id,
    customer_id: updatedRequest.customer_id,
    reason: updatedRequest.reason ?? undefined,
    status: updatedRequest.status as "pending" | "approved" | "rejected",
    rejection_reason: updatedRequest.rejection_reason ?? undefined,
    responded_by: updatedRequest.responded_by ?? undefined,
    created_at: updatedRequest.created_at.toISOString() as string &
      tags.Format<"date-time">,
    responded_at: updatedRequest.responded_at?.toISOString() as string &
      tags.Format<"date-time">,
  };
}
