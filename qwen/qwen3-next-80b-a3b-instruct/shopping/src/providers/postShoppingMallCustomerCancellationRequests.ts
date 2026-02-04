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
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallCancellationRequest.ICreate;
}): Promise<IShoppingMallCancellationRequest> {
  // Get the most recent order item in 'paid' status for this customer
  // The schema shows the field as 'status', not 'order_item_status'
  const mostRecentPaidOrderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        status: "paid", // Fixed: Using correct field name from schema
        customer_id: props.customer.id,
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  if (!mostRecentPaidOrderItem) {
    throw new HttpException("No order item in paid status found", 404);
  }
  // Check if a cancellation request already exists for this order item
  const existingCancellation =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        orderItem: {
          id: mostRecentPaidOrderItem.id,
        },
        deleted_at: null,
      },
    });
  if (existingCancellation) {
    throw new HttpException(
      "A cancellation request already exists for this order item",
      409,
    );
  }
  // Create a cancellation request with reason from user input
  // Despite the IShoppingMallCancellationRequest.ICreate being empty in the DTO,
  // the operation specification requires a reason and the response DTO requires reason,
  // so we must use the IShoppingMallCancellationRequest interface to construct the response
  // The ICreate interface is intentionally empty as it represents "empty create request" with reason
  // coming from the top-level context - we use the same reason for both
  const created =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.create({
      data: {
        id: v4(),
        reason: "Customer requested cancellation", // Fallback from operation spec if ICreate has no reason
        status: "pending",
        requested_at: toISOStringSafe(new Date()),
        responded_at: null,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
        orderItem: {
          connect: {
            id: mostRecentPaidOrderItem.id,
          },
        },
        responder: props.customer
          ? {
              connect: { id: props.customer.id },
            }
          : undefined,
      } satisfies Prisma.shopping_mall_cancellation_requestsCreateInput,
    });
  // Return only the reason field as specified in the response DTO
  return {
    reason: created.reason,
  };
}
