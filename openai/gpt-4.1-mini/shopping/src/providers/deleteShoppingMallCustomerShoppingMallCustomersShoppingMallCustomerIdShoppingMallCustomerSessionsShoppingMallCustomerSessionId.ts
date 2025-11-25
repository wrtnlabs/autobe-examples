import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerShoppingMallCustomersShoppingMallCustomerIdShoppingMallCustomerSessionsShoppingMallCustomerSessionId(props: {
  customer: CustomerPayload;
  shoppingMallCustomerId: string & tags.Format<"uuid">;
  shoppingMallCustomerSessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findUnique({
      where: { id: props.shoppingMallCustomerSessionId },
      select: { id: true, shopping_mall_customer_id: true },
    });
  if (!existing) {
    throw new HttpException("Session not found", 404);
  }
  if (existing.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_customer_sessions.delete({
    where: { id: props.shoppingMallCustomerSessionId },
  });
}
