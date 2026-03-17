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

export async function deleteShoppingMallCustomerCancellationRequestsCancellationRequestId(props: {
  customer: CustomerPayload;
  cancellationRequestId: string;
}): Promise<void> {
  // 1. Find the cancellation request
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          id: true,
          status: true,
          orderItem: {
            select: {
              id: true,
              order: {
                select: {
                  id: true,
                  shopping_mall_customer_id: true,
                },
              },
            },
          },
        },
      },
    );
  // 2. Verify ownership - order must belong to authenticated customer
  if (
    cancellationRequest.orderItem.order.shopping_mall_customer_id !==
    props.customer.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Check status - only pending requests can be deleted
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      "Cannot delete a resolved cancellation request",
      400,
    );
  }
  // 4. Safety check - verify no snapshots exist
  const snapshotCount =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.count({
      where: {
        shopping_mall_cancellation_request_id: props.cancellationRequestId,
      },
    });
  if (snapshotCount > 0) {
    throw new HttpException(
      "Cannot delete cancellation request with audit history",
      400,
    );
  }
  // 5. Delete the cancellation request
  await MyGlobal.prisma.shopping_mall_cancellation_requests.delete({
    where: { id: props.cancellationRequestId },
  });
}
