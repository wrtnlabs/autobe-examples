import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerCustomersCustomerId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomer.IUpdate;
}): Promise<IShoppingMallCustomer> {
  if (props.customer.id !== props.customerId) {
    throw new HttpException(
      "Forbidden: You can only update your own profile.",
      403,
    );
  }

  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customerId },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }

  if (props.body.email !== undefined && props.body.email !== customer.email) {
    const conflict = await MyGlobal.prisma.shopping_mall_customers.findFirst({
      where: { email: props.body.email },
    });
    if (conflict) {
      throw new HttpException(
        "That email is already registered to another user.",
        409,
      );
    }
  }

  const updateData = {
    ...(props.body.email !== undefined ? { email: props.body.email } : {}),
    ...(props.body.name !== undefined ? { name: props.body.name } : {}),
    ...(props.body.phone !== undefined ? { phone: props.body.phone } : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  const updated = await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.customerId },
    data: updateData,
  });

  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    phone: updated.phone,
    is_email_verified: updated.is_email_verified,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
