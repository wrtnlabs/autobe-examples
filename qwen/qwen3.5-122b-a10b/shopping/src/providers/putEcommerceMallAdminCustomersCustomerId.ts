import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

export async function putEcommerceMallAdminCustomersCustomerId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IEcommerceMallCustomer.IUpdate;
}): Promise<IEcommerceMallCustomer> {
  // Find the customer
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findUnique({
    where: { id: props.customerId },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }
  // Check if customer is banned
  if (customer.account_status === "banned") {
    throw new HttpException("Cannot update banned customer", 403);
  }
  // Validate display_name length
  if (
    props.body.display_name !== undefined &&
    props.body.display_name !== null
  ) {
    if (props.body.display_name.length > 100) {
      throw new HttpException(
        "Display name exceeds maximum length of 100 characters",
        400,
      );
    }
  }
  // Validate phone_number format if provided
  if (
    props.body.phone_number !== undefined &&
    props.body.phone_number !== null
  ) {
    const phoneRegex = /^[0-9+\-\s()]+$/;
    if (!phoneRegex.test(props.body.phone_number)) {
      throw new HttpException("Invalid phone number format", 400);
    }
  }
  // Update the customer
  const updated = await MyGlobal.prisma.ecommerce_mall_customers.update({
    where: { id: props.customerId },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.phone_number !== undefined && {
        phone_number: props.body.phone_number,
      }),
      updated_at: new Date(),
    },
  });
  // Transform and return
  return {
    id: updated.id as string & tags.Format<"uuid">,
    email: updated.email as string & tags.Format<"email">,
    display_name: updated.display_name,
    phone_number: updated.phone_number,
    account_status: typia.assert<"active" | "suspended" | "banned">(
      updated.account_status,
    ),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
