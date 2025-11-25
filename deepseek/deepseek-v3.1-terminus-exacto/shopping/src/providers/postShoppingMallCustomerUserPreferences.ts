import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserPreference";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerUserPreferences(props: {
  customer: CustomerPayload;
  body: IShoppingMallUserPreference.ICreate;
}): Promise<IShoppingMallUserPreference> {
  // First verify the customer exists and is active
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      id: props.customer.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (!customer) {
    throw new HttpException("Customer not found or inactive", 404);
  }

  // Check if preference already exists for this customer
  const existingPreference =
    await MyGlobal.prisma.shopping_mall_user_preferences.findFirst({
      where: {
        shopping_mall_customer_id: props.customer.id,
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

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_user_preferences.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_customer_id: props.customer.id,
      preference_type: props.body.preference_type,
      preference_key: props.body.preference_key,
      preference_value: props.body.preference_value,
      category: props.body.category ?? null,
      is_active: true,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    include: {
      customer: {
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          phone_number: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });

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
    customer: {
      id: created.customer.id,
      email: created.customer.email,
      first_name: created.customer.first_name,
      last_name: created.customer.last_name,
      phone_number: created.customer.phone_number ?? undefined,
      status: created.customer.status,
      created_at: toISOStringSafe(created.customer.created_at),
      updated_at: created.customer.updated_at
        ? toISOStringSafe(created.customer.updated_at)
        : undefined,
    },
  };
}
