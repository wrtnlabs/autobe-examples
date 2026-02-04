import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerRefundRequestsRefundRequestId(props: {
  seller: SellerPayload;
  refundRequestId: string;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<IShoppingMallRefundRequest> {
  // Begin transaction for atomic operations
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Query refund request with related order item and seller info
    const refundRequest = await prisma.shopping_mall_refund_requests.findUnique(
      {
        where: { id: props.refundRequestId },
        include: {
          orderItem: {
            include: {
              seller: true,
            },
          },
        },
      },
    );
    // Validate refund request exists
    if (!refundRequest) {
      throw new HttpException("Refund request not found", 404);
    }
    // Validate seller is the original order seller
    if (refundRequest.orderItem.seller_id !== props.seller.id) {
      throw new HttpException(
        "Forbidden - You can only update refund requests for your own orders",
        403,
      );
    }
    // Validate status is still pending (cannot update if already approved or rejected)
    if (refundRequest.status !== "pending") {
      throw new HttpException(
        "Refund request is not pending - already approved or rejected",
        409,
      );
    }
    // Determine update action based on props.body.status
    if (props.body.status === "approve") {
      // Approve refund: restore inventory
      await prisma.shopping_mall_inventory_records.create({
        data: {
          id: v4(),
          variant_id: refundRequest.orderItem.variant_id,
          change_quantity: refundRequest.orderItem.quantity, // Fixed: Changed 'quantity' to 'change_quantity' to match schema
          source_type: "refund",
          source_reference_id: refundRequest.id,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
      });
      // Update refund request to approved
      const updatedRequest = await prisma.shopping_mall_refund_requests.update({
        where: { id: props.refundRequestId },
        data: {
          status: "approved",
          updated_at: toISOStringSafe(new Date()),
          responded_by: props.seller.id,
          responded_at: toISOStringSafe(new Date()),
        },
      });
      return {
        status: "approved" satisfies "approved" as "approved",
        message:
          "Refund request approved. Inventory has been restored and refund processed to customer.",
      };
    } else if (props.body.status === "reject") {
      // Reject refund: update with reason
      const updatedRequest = await prisma.shopping_mall_refund_requests.update({
        where: { id: props.refundRequestId },
        data: {
          status: "rejected",
          updated_at: toISOStringSafe(new Date()),
          responded_by: props.seller.id,
          responded_at: toISOStringSafe(new Date()),
          reason: props.body.reason,
        },
      });
      const message = props.body.reason
        ? `Refund request rejected: ${props.body.reason}`
        : "Refund request rejected.";
      return {
        status: "rejected" satisfies "rejected" as "rejected",
        message,
      };
    } else {
      // This should never happen due to DTO validation, but included for safety
      throw new HttpException("Invalid status value", 400);
    }
  });
  return result;
}
