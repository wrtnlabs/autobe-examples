import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceCustomerCancellationRequestsCancellationRequestId(props: {
  customer: CustomerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Retrieve the cancellation request with its latest status transition
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findFirst({
      where: {
        id: props.cancellationRequestId,
        deleted_at: null,
      },
      include: {
        statusTransitions: {
          where: {},
          orderBy: { created_at: "desc" },
          take: 1,
          select: { status: true },
        } satisfies Prisma.ecommerce_cancellation_request_statusesFindManyArgs,
      },
    });
  // 2. Validate existence
  if (!cancellationRequest) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // 3. Validate ownership
  if (cancellationRequest.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Validate status - cannot delete approved or rejected requests
  const latestStatus = cancellationRequest.statusTransitions[0]?.status;
  // Default to 'pending' if no status transitions exist (newly created request)
  const currentStatus = latestStatus ?? "pending";
  if (currentStatus === "approved" || currentStatus === "rejected") {
    throw new HttpException(
      "Cannot delete cancellation request in final state",
      400,
    );
  }
  // 5. Perform soft delete with ISO datetime string
  const deletionTimestamp = toISOStringSafe(new Date());
  await MyGlobal.prisma.ecommerce_cancellation_requests.update({
    where: { id: props.cancellationRequestId },
    data: {
      deleted_at: deletionTimestamp,
    },
  });
}
