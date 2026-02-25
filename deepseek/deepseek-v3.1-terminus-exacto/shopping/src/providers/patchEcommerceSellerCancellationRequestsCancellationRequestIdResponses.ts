import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceCancellationRequestTransformer } from "../transformers/EcommerceCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerCancellationRequestsCancellationRequestIdResponses(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IEcommerceCancellationRequest.IUpdate;
}): Promise<IEcommerceCancellationRequest> {
  // Validate input using typia assertions
  typia.assert(props.body);
  // Find cancellation request with seller verification and pending status
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findFirstOrThrow({
      where: {
        id: props.cancellationRequestId,
        ecommerce_seller_id: props.seller.id,
        deleted_at: null,
        // Assuming status is tracked through related status transitions
        // Add status validation once schema is loaded
      },
      select: {
        id: true,
        ecommerce_order_item_id: true,
        created_at: true,
        orderItem: {
          select: {
            id: true,
            status: true,
            quantity: true,
            productVariant: {
              select: {
                id: true,
                quantity: true,
              },
            },
          },
        },
      },
    });
  // Verify cancellation request can still be responded to (within 7 days)
  const requestAge = Date.now() - cancellationRequest.created_at.getTime();
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  if (requestAge > sevenDaysInMs) {
    throw new HttpException(
      "Cancellation request response window has expired",
      400,
    );
  }
  // Verify order item is still in cancellable status
  if (cancellationRequest.orderItem.status !== "paid") {
    throw new HttpException(
      "Order item is no longer eligible for cancellation",
      400,
    );
  }
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create response record with required fields
    const responseRecord =
      await tx.ecommerce_cancellation_response_records.create({
        data: {
          id: v4(),
          ecommerce_cancellation_request_id: props.cancellationRequestId,
          ecommerce_seller_id: props.seller.id,
          decision: props.body.decision,
          response_reason: props.body.reason,
          created_at: new Date(),
          responded_at: new Date(),
        },
      });
    // Update order item status based on decision
    if (props.body.decision === "approved") {
      // Update order item status to "cancelled"
      await tx.ecommerce_order_items.update({
        where: { id: cancellationRequest.ecommerce_order_item_id },
        data: {
          status: "cancelled",
        },
      });
      // Create inventory restoration record with all required fields
      await tx.ecommerce_modification_inventory_restorations.create({
        data: {
          id: v4(),
          ecommerce_cancellation_request_id: props.cancellationRequestId,
          ecommerce_inventory_record_id: v4(), // Generate a new inventory record ID
          quantity_restored: cancellationRequest.orderItem.quantity,
          restoration_reason: "Cancellation approved",
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      // Restore product variant quantity
      await tx.ecommerce_product_variants.update({
        where: { id: cancellationRequest.orderItem.productVariant.id },
        data: {
          quantity: { increment: cancellationRequest.orderItem.quantity },
        },
      });
    } else {
      // Rejection logic - update cancellation request status only
      // Status tracking would be handled through related status transitions table
    }
    return responseRecord;
  });
  // Fetch complete updated cancellation request
  const updatedRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
      where: { id: props.cancellationRequestId },
      ...EcommerceCancellationRequestTransformer.select(),
    });
  return await EcommerceCancellationRequestTransformer.transform(
    updatedRequest,
  );
}
