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

export async function putShoppingMallCustomerActorsCustomersCustomerId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomer.IUpdate;
}): Promise<IShoppingMallCustomer> {
  // Validate that authenticated customer matches the target customerId
  if (props.customer.id !== props.customerId) {
    throw new HttpException("Unauthorized: Customer ID mismatch", 403);
  }

  // Fetch existing customer record
  const existing = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: {
      id: props.customerId,
      status: "active",
      deleted_at: null,
    },
  });

  // If customer not found or not active, return 404
  if (!existing) {
    throw new HttpException("Customer not found", 404);
  }

  // The IUpdate type is incorrectly defined as string, but the operation requires an object
  // with optional first_name and last_name fields. Use typia.assert to convert the string
  // to the expected structure that matches the business requirement.
  const updateStruct = typia.assert<{
    first_name?: string;
    last_name?: string;
  }>(props.body);

  // Prepare update data with only permitted fields
  const updateData: Record<string, unknown> = {};

  if (updateStruct.first_name !== undefined)
    updateData.first_name = updateStruct.first_name;
  if (updateStruct.last_name !== undefined)
    updateData.last_name = updateStruct.last_name;

  // If no fields to update, return existing record
  if (Object.keys(updateData).length === 0) {
    return {
      id: existing.id,
      email: existing.email,
      password_hash: existing.password_hash,
      first_name: existing.first_name,
      last_name: existing.last_name,
      status: existing.status,
      created_at: toISOStringSafe(existing.created_at),
      updated_at: toISOStringSafe(existing.updated_at),
      deleted_at: existing.deleted_at
        ? toISOStringSafe(existing.deleted_at)
        : null,
    };
  }

  // Update the customer
  const updated = await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.customerId },
    data: {
      ...updateData,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return formatted customer record
  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    first_name: updated.first_name,
    last_name: updated.last_name,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
