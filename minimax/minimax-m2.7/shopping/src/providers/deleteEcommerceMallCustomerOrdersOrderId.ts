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

export async function deleteEcommerceMallCustomerOrdersOrderId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the order by orderId and verify it belongs to the authenticated customer
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirst({
    where: {
      id: props.orderId,
      ecommerce_mall_customer_id: props.customer.id,
    },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  // If order not found or does not belong to customer, return 404
  if (order === null) {
    throw new HttpException("Not Found", 404);
  }
  // If order already deleted, return 409 Conflict
  if (order.deleted_at !== null) {
    throw new HttpException("Conflict", 409);
  }
  // Soft delete the order by setting deleted_at timestamp
  await MyGlobal.prisma.ecommerce_mall_orders.update({
    where: { id: props.orderId },
    data: {
      deleted_at: new Date(),
    },
  });
}
