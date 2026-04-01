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
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: {
        id: props.customerId,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        display_name: true,
        status: true,
      },
    });
  // Check for blocking orders with 'paid' or 'shipped' status
  const blockingOrders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: {
      shopping_mall_customer_id: props.customerId,
      deleted_at: null,
      status: {
        in: ["paid", "shipped"],
      },
    },
    select: {
      id: true,
      status: true,
    },
  });
  // Check for pending cancellation requests
  const pendingCancellations =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where: {
        shopping_mall_customer_id: props.customerId,
        deleted_at: null,
        status: "pending",
      },
      select: {
        id: true,
      },
    });
  // Check for pending refund requests
  const pendingRefunds =
    await MyGlobal.prisma.shopping_mall_refund_requests.findMany({
      where: {
        shopping_mall_customer_id: props.customerId,
        deleted_at: null,
        status: "pending",
      },
      select: {
        id: true,
      },
    });
  // Collect blocking conditions
  const blockingConditions: string[] = [];
  if (blockingOrders.length > 0) {
    blockingConditions.push(
      `Has ${blockingOrders.length} order(s) with paid or shipped status`,
    );
  }
  if (pendingCancellations.length > 0) {
    blockingConditions.push(
      `Has ${pendingCancellations.length} pending cancellation request(s)`,
    );
  }
  if (pendingRefunds.length > 0) {
    blockingConditions.push(
      `Has ${pendingRefunds.length} pending refund request(s)`,
    );
  }
  // If blocking conditions exist, reject deletion
  if (blockingConditions.length > 0) {
    throw new HttpException(
      `Cannot delete customer account. Blocking conditions: ${blockingConditions.join(", ")}`,
      400,
    );
  }
  // Perform soft delete with anonymization
  await MyGlobal.prisma.shopping_mall_customers.update({
    where: {
      id: props.customerId,
    },
    data: {
      deleted_at: new Date(),
      display_name: "Deleted User",
      email: `deleted_${v4()}@deleted.local`,
      password_hash: "",
    },
  });
}
