import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdminCustomersCustomerId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify customer exists and is not already deleted
  await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
    where: {
      id: props.customerId,
      deleted_at: null,
    },
  });
  // Check for blocking conditions
  const blockingConditions: string[] = [];
  // Check for orders with 'paid' or 'shipped' status
  const ordersCount = await MyGlobal.prisma.shopping_mall_orders.count({
    where: {
      shopping_mall_customer_id: props.customerId,
      deleted_at: null,
      status: {
        in: ["paid", "shipped"],
      },
    },
  });
  if (ordersCount > 0) {
    blockingConditions.push(
      `Has ${ordersCount} order(s) with paid or shipped status`,
    );
  }
  // Check for pending cancellation requests
  const cancellationRequestsCount =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        shopping_mall_customer_id: props.customerId,
        deleted_at: null,
        status: "pending",
      },
    });
  if (cancellationRequestsCount > 0) {
    blockingConditions.push(
      `Has ${cancellationRequestsCount} pending cancellation request(s)`,
    );
  }
  // Check for pending refund requests
  const refundRequestsCount =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        shopping_mall_customer_id: props.customerId,
        deleted_at: null,
        status: "pending",
      },
    });
  if (refundRequestsCount > 0) {
    blockingConditions.push(
      `Has ${refundRequestsCount} pending refund request(s)`,
    );
  }
  // If blocking conditions exist, reject the deletion
  if (blockingConditions.length > 0) {
    throw new HttpException(
      `Cannot delete account. Blocking conditions: ${blockingConditions.join(", ")}`,
      400,
    );
  }
  // Perform soft delete with anonymization
  const nullifiedEmail = `deleted_${v4()}@deleted.local`;
  await MyGlobal.prisma.shopping_mall_customers.update({
    where: {
      id: props.customerId,
    },
    data: {
      deleted_at: new Date(),
      display_name: "Deleted User",
      email: nullifiedEmail,
      password_hash: "",
    },
  });
}
