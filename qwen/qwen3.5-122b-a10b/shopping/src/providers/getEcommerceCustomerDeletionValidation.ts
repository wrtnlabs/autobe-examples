import { IEcommerceDeletionValidationResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDeletionValidationResult";
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

export async function getEcommerceCustomerDeletionValidation(props: {
  customer: CustomerPayload;
}): Promise<IEcommerceDeletionValidationResult> {
  // Query for active orders with items in paid, shipped, or delivered status
  const activeOrder = await MyGlobal.prisma.ecommerce_orders.findFirst({
    where: {
      ecommerce_customer_id: props.customer.id,
      deleted_at: null,
      orderItems: {
        some: {
          status: {
            in: ["paid", "shipped", "delivered" as const],
          },
          deleted_at: null,
        },
      },
    },
    select: {
      id: true,
      order_number: true,
      orderItems: {
        where: {
          status: {
            in: ["paid", "shipped", "delivered" as const],
          },
          deleted_at: null,
        },
        select: {
          status: true,
        },
        take: 1,
      },
    },
  });
  if (activeOrder !== null) {
    const orderItem = activeOrder.orderItems[0];
    return {
      resourceType: "order",
      resourceId: activeOrder.id,
      reason: `Customer has active order #${activeOrder.order_number} with items in ${orderItem.status} status. Order history must be preserved for seller records and legal compliance.`,
    };
  }
  // No blocking constraints found - account can be deleted
  return {
    resourceType: "none",
    resourceId: "00000000-0000-0000-0000-000000000000",
    reason: "Account can be deleted - no blocking constraints found.",
  };
}
