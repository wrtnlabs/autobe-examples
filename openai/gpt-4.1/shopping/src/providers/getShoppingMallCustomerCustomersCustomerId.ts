import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerCustomersCustomerId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomer> {
  // Deny if the request attempts to fetch another user's profile.
  if (props.customer.id !== props.customerId) {
    throw new HttpException(
      "Access denied: cannot view another customer's profile",
      403,
    );
  }

  const record = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customerId },
  });

  if (!record) {
    throw new HttpException("Customer not found", 404);
  }

  return {
    id: record.id,
    email: record.email,
    name: record.name,
    phone: record.phone,
    is_email_verified: record.is_email_verified,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
