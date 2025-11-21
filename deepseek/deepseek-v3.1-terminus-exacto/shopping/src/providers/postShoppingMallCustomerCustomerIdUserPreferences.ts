import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserPreference";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerCustomerIdUserPreferences(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallUserPreference.ICreate;
}): Promise<IShoppingMallUserPreference> {
  // Verify customer authorization - authenticated customer must match customerId
  if (props.customer.id !== props.customerId) {
    throw new HttpException(
      "You can only create preferences for your own account",
      403,
    );
  }

  // Check if preference already exists (composite unique constraint)
  const existingPreference =
    await MyGlobal.prisma.shopping_mall_user_preferences.findFirst({
      where: {
        shopping_mall_customer_id: props.customerId,
        preference_type: props.body.preference_type,
        preference_key: props.body.preference_key,
        deleted_at: null,
      },
    });

  if (existingPreference) {
    throw new HttpException(
      "Preference with this type and key already exists for this customer",
      409,
    );
  }

  // Get customer details for the summary
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customerId },
  });

  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }

  const now = toISOStringSafe(new Date());

  // Create the preference
  const created = await MyGlobal.prisma.shopping_mall_user_preferences.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_customer_id: props.customerId,
      preference_type: props.body.preference_type,
      preference_key: props.body.preference_key,
      preference_value: props.body.preference_value,
      category: props.body.category ?? null,
      is_active: true,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Build customer summary
  const customerSummary: IShoppingMallCustomer.ISummary = {
    id: customer.id,
    email: customer.email,
    first_name: customer.first_name,
    last_name: customer.last_name,
    phone_number: customer.phone_number ?? undefined,
    status: customer.status,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: customer.updated_at
      ? toISOStringSafe(customer.updated_at)
      : undefined,
  };

  return {
    id: created.id,
    preference_type: created.preference_type,
    preference_key: created.preference_key,
    preference_value: created.preference_value,
    category: created.category ?? undefined,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
    customer: customerSummary,
  };
}
