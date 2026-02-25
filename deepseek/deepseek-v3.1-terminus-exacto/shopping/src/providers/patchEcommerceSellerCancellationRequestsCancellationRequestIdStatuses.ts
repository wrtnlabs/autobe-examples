import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCancellationRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequestStatus";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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
import { EcommerceCancellationRequestStatusTransformer } from "../transformers/EcommerceCancellationRequestStatusTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerCancellationRequestsCancellationRequestIdStatuses(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IEcommerceCancellationRequestStatus.IUpdate;
}): Promise<IEcommerceCancellationRequestStatus> {
  // Validate cancellation request exists and belongs to seller
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
      where: { id: props.cancellationRequestId },
      select: {
        id: true,
        ecommerce_seller_id: true,
        ecommerce_order_item_id: true,
        statusTransitions: {
          orderBy: { created_at: "desc" as const },
          take: 1,
          select: { status: true },
        } satisfies Prisma.ecommerce_cancellation_request_statusesFindManyArgs,
      },
    });
  // Check seller authorization
  if (cancellationRequest.ecommerce_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check current status is 'pending'
  const currentStatus = cancellationRequest.statusTransitions[0]?.status;
  if (currentStatus !== "pending") {
    throw new HttpException(
      "Cancellation request is not in pending status",
      400,
    );
  }
  // Since the body only provides transition_notes and not the actual status,
  // we need to determine the status based on business logic.
  // According to the specification, sellers can approve or reject cancellation requests.
  // For now, we'll default to 'approved' as per the draft, but this needs clarification.
  const newStatus = "approved"; // This should be determined from business logic
  // Create new status transition record
  const now = new Date();
  const statusTransition =
    await MyGlobal.prisma.ecommerce_cancellation_request_statuses.create({
      data: {
        id: v4(),
        ecommerce_cancellation_request_id: props.cancellationRequestId,
        status: newStatus,
        transition_notes: props.body.transition_notes ?? null,
        created_at: now,
        updated_at: now,
      },
      ...EcommerceCancellationRequestStatusTransformer.select(),
    });
  // If status is approved, create cancellation response record
  if (newStatus === "approved") {
    await MyGlobal.prisma.ecommerce_cancellation_response_records.create({
      data: {
        id: v4(),
        ecommerce_cancellation_request_id: props.cancellationRequestId,
        ecommerce_seller_id: props.seller.id,
        decision: "approved",
        response_reason: props.body.transition_notes ?? "Approved by seller",
        responded_at: now,
        created_at: now,
      },
    });
    // Trigger cancellation workflow (stock restoration, payment reversal)
    // This would involve additional business logic
  }
  return await EcommerceCancellationRequestStatusTransformer.transform(
    statusTransition,
  );
}
