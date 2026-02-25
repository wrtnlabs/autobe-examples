import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerCancellationRequestsCancellationRequestId(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IUpdate;
}): Promise<IShoppingMallCancellationRequest> {
  const existing =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
      },
    );
  const allowedStatuses = ["pending", "approved", "rejected"] as const;
  if (
    props.body.sellerApprovalStatus !== undefined &&
    !allowedStatuses.includes(
      props.body.sellerApprovalStatus as (typeof allowedStatuses)[number],
    )
  ) {
    throw new HttpException("Invalid sellerApprovalStatus value", 400);
  }
  let processedAt: string | null | undefined = undefined;
  if (
    (props.body.sellerApprovalStatus === "approved" ||
      props.body.sellerApprovalStatus === "rejected") &&
    !existing.processed_at
  ) {
    processedAt = new Date().toISOString();
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const nowIso = new Date().toISOString();
    const updateData: Prisma.shopping_mall_cancellation_requestsUpdateInput = {
      ...(props.body.reason !== undefined && { reason: props.body.reason }),
      ...(props.body.sellerApprovalStatus !== undefined && {
        seller_approval_status: props.body.sellerApprovalStatus,
      }),
      ...(props.body.sellerApprovalReason !== undefined && {
        seller_approval_reason: props.body.sellerApprovalReason,
      }),
      ...(processedAt !== undefined && { processed_at: processedAt }),
      updated_at: nowIso,
    };
    const updateResult = await tx.shopping_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: updateData,
    });
    // Must provide 'status' property for snapshots entity
    await tx.shopping_mall_cancellation_request_snapshots.create({
      data: {
        id: v4(),
        cancellationRequest: { connect: { id: updateResult.id } },
        reason: updateResult.reason,
        status: updateResult.seller_approval_status,
        created_at: updateResult.created_at,
        updated_at: updateResult.updated_at,
        deleted_at: updateResult.deleted_at ?? null,
      },
    });
    return updateResult;
  });
  // Load full related data needed by transformer
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: updated.shopping_mall_customer_id },
    });
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: updated.shopping_mall_order_item_id },
      include: {
        refundRequests: true,
        order: {
          include: {
            customer: true,
            reviews: true,
            orderItemSnapshots: true,
            orderItems: true,
            orderSnapshots: true,
          },
        },
        productVariant: {
          include: {
            snapshots: true,
            productReviews: true,
            productReviewSnapshots: true,
            orderItems: true,
            product: true,
            inventoryHistories: true,
          },
        },
        snapshots: true,
        shipmentItems: true,
        cancellationRequests: true,
        reviews: true,
        shipmentOrderItems: true,
        productReviews: true,
        productReviewSnapshots: true,
      },
    });
  return await ShoppingMallCancellationRequestTransformer.transform({
    ...updated,
    requested_at: updated.requested_at.toISOString(),
    processed_at: updated.processed_at
      ? updated.processed_at.toISOString()
      : null,
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
    deleted_at: updated.deleted_at ? updated.deleted_at.toISOString() : null,
    customer,
    orderItem,
  });
}
