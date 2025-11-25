import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminCustomersCustomerId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomer.IUpdate;
}): Promise<IShoppingMallCustomer> {
  // Find the existing customer
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customerId },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }

  // If updating email, ensure uniqueness (excluding this customer)
  if (props.body.email !== undefined) {
    const existingEmail =
      await MyGlobal.prisma.shopping_mall_customers.findFirst({
        where: {
          email: props.body.email,
          id: { not: props.customerId },
        },
      });
    if (existingEmail) {
      throw new HttpException(
        "Email address is already registered by another customer",
        409,
      );
    }
  }

  // Prepare update data (patch only actual present fields)
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.name !== undefined) updateData.name = props.body.name;
  if (props.body.email !== undefined) updateData.email = props.body.email;
  if (props.body.phone !== undefined) updateData.phone = props.body.phone;

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
