import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

export async function patchShoppingMallSellerRefundRequestsRefundRequestIdReject(props: {
  seller: SellerPayload;
  refundRequestId: string;
}): Promise<IShoppingMallRefundRequest> {
  // Step 1: Query refund request with order item relation
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        responded_at: true,
        orderItem: {
          select: {
            id: true,
            shopping_mall_seller_id: true,
          },
        },
      },
    });
  if (refundRequest === null) {
    throw new HttpException("Refund request not found", 404);
  }
  // Step 2: Validate status is pending
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request has already been resolved", 400);
  }
  // Step 3: Verify seller ownership
  if (refundRequest.orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "You are not authorized to respond to this refund request",
      403,
    );
  }
  // Step 4: Check seller is not banned
  const sellerRecord = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.seller.id },
    select: { banned: true },
  });
  if (sellerRecord?.banned === true) {
    throw new HttpException("Your account has been banned", 403);
  }
  // Step 5: Execute transaction - update and create snapshot
  const now = new Date();
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update refund request
    const updatedRequest = await tx.shopping_mall_refund_requests.update({
      where: { id: props.refundRequestId },
      data: {
        status: "rejected",
        responded_at: now,
      },
      ...ShoppingMallRefundRequestTransformer.select(),
    });
    // Create snapshot
    await tx.shopping_mall_refund_request_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_refund_request_id: props.refundRequestId,
        reason: refundRequest.reason,
        status: "rejected",
        created_at: now,
      },
    });
    return updatedRequest;
  });
  // Step 6: Return transformed result
  return await ShoppingMallRefundRequestTransformer.transform(updated);
}
