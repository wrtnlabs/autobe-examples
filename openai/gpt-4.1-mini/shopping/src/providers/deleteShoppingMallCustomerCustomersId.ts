import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerCustomersId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the target customer by ID
  const existingCustomer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.id },
    });

  // Authorization check: customer can delete only their own account
  if (existingCustomer.id !== props.customer.id) {
    throw new HttpException(
      "Unauthorized: cannot delete other customer accounts",
      403,
    );
  }

  // Soft delete: set deleted_at to current timestamp
  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.id },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // void return
}
