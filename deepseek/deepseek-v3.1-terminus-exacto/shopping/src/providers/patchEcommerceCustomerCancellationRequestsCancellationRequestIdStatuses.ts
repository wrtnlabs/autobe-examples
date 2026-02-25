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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCancellationRequestTransformer } from "../transformers/EcommerceCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerCancellationRequestsCancellationRequestIdStatuses(props: {
  customer: CustomerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IEcommerceCancellationRequest.IUpdate;
}): Promise<IEcommerceCancellationRequest> {
  // Validate decision is valid enum
  if (
    props.body.decision !== "approved" &&
    props.body.decision !== "rejected"
  ) {
    throw new HttpException("Decision must be 'approved' or 'rejected'", 400);
  }
  // Validate cancellation request exists and belongs to customer with pending status
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findFirstOrThrow({
      where: {
        id: props.cancellationRequestId,
        ecommerce_customer_id: props.customer.id,
        deleted_at: null,
        // Check that no response record exists (pending status)
        responseRecord: null,
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
                quantity: true,
              },
            },
          },
        },
      },
    });
  // Validate order item is in paid status
  if (cancellationRequest.orderItem.status !== "paid") {
    throw new HttpException(
      "Cannot update status for already processed order item",
      400,
    );
  }
  const now = new Date();
  // Create status transition
  await MyGlobal.prisma.ecommerce_cancellation_request_statuses.create({
    data: {
      id: v4(),
      ecommerce_cancellation_request_id: props.cancellationRequestId,
      status: props.body.decision,
      created_at: now,
      updated_at: now,
    },
  });
  // Create response record
  await MyGlobal.prisma.ecommerce_cancellation_response_records.create({
    data: {
      id: v4(),
      ecommerce_cancellation_request_id: props.cancellationRequestId,
      ecommerce_seller_id: props.customer.id,
      decision: props.body.decision,
      response_reason: props.body.reason,
      responded_at: now,
      created_at: now,
    },
  });
  // Update cancellation request timestamp
  await MyGlobal.prisma.ecommerce_cancellation_requests.update({
    where: { id: props.cancellationRequestId },
    data: { updated_at: now },
  });
  // If approved, trigger cancellation workflow
  if (props.body.decision === "approved") {
    // Update order item status to cancelled
    await MyGlobal.prisma.ecommerce_order_items.update({
      where: { id: cancellationRequest.orderItem.id },
      data: { status: "cancelled" },
    });
    // Stock restoration would be handled by separate workflow
    // For now, we just update the cancellation request
  }
  // Get updated cancellation request with full relations
  const updatedRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
      where: { id: props.cancellationRequestId },
      ...EcommerceCancellationRequestTransformer.select(),
    });
  return await EcommerceCancellationRequestTransformer.transform(
    updatedRequest,
  );
}
