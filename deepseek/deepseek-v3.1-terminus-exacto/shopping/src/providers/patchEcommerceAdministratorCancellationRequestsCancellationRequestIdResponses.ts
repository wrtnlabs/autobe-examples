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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceCancellationRequestTransformer } from "../transformers/EcommerceCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchEcommerceAdministratorCancellationRequestsCancellationRequestIdResponses(props: {
  administrator: AdministratorPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IEcommerceCancellationRequest.IUpdate;
}): Promise<IEcommerceCancellationRequest> {
  // First get the cancellation request with relationships to validate
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
      where: {
        id: props.cancellationRequestId,
        deleted_at: null,
      },
      include: {
        orderItem: {
          select: {
            id: true,
            status: true,
            quantity: true,
            productVariant: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  // Verify the order item is still in paid status (eligible for cancellation)
  if (cancellationRequest.orderItem.status !== "paid") {
    throw new HttpException(
      "Cancellation request cannot be processed for shipped or delivered items",
      400,
    );
  }
  // Validate decision is either 'approved' or 'rejected'
  const validDecisions = ["approved", "rejected"] as const;
  if (!validDecisions.includes(props.body.decision)) {
    throw new HttpException("Decision must be 'approved' or 'rejected'", 400);
  }
  // Check if response record already exists
  const existingResponse =
    await MyGlobal.prisma.ecommerce_cancellation_response_records.findFirst({
      where: {
        ecommerce_cancellation_request_id: props.cancellationRequestId,
      },
    });
  if (existingResponse) {
    throw new HttpException(
      "Response already exists for this cancellation request",
      400,
    );
  }
  const now = new Date();
  // Create response record with correct field names including required seller_id
  await MyGlobal.prisma.ecommerce_cancellation_response_records.create({
    data: {
      id: v4(),
      ecommerce_cancellation_request_id: props.cancellationRequestId,
      ecommerce_seller_id: cancellationRequest.ecommerce_seller_id,
      decision: props.body.decision,
      response_reason: props.body.reason,
      responded_at: now,
      created_at: now,
    },
  });
  // Handle approval/rejection consequences
  if (props.body.decision === "approved") {
    // Update order item status to cancelled
    await MyGlobal.prisma.ecommerce_order_items.update({
      where: { id: cancellationRequest.orderItem.id },
      data: {
        status: "cancelled",
      },
    });
    // Restore inventory using correct field names and relations
    await MyGlobal.prisma.ecommerce_inventory_records.create({
      data: {
        id: v4(),
        variant: {
          connect: { id: cancellationRequest.orderItem.productVariant.id },
        },
        seller: {
          connect: { id: cancellationRequest.ecommerce_seller_id },
        },
        quantity: cancellationRequest.orderItem.quantity,
        reason: "cancellation_restoration",
        created_at: now,
        updated_at: now,
      },
    });
  }
  // Get updated cancellation request with full details using transformer
  const updatedCancellationRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
      where: { id: props.cancellationRequestId },
      ...EcommerceCancellationRequestTransformer.select(),
    });
  return await EcommerceCancellationRequestTransformer.transform(
    updatedCancellationRequest,
  );
}
