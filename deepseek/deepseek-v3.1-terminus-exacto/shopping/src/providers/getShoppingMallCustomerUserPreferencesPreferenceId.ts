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

export async function getShoppingMallCustomerUserPreferencesPreferenceId(props: {
  customer: CustomerPayload;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallUserPreference> {
  // Find the preference record with customer relationship
  const preference =
    await MyGlobal.prisma.shopping_mall_user_preferences.findFirst({
      where: {
        id: props.preferenceId,
        shopping_mall_customer_id: props.customer.id,
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

  if (!preference) {
    throw new HttpException("Preference not found", 404);
  }

  // Customer relationship should exist due to foreign key constraint
  if (!preference.customer) {
    throw new HttpException("Customer data not found", 500);
  }

  // Convert Date fields to ISO strings and return
  return {
    id: preference.id,
    preference_type: preference.preference_type,
    preference_key: preference.preference_key,
    preference_value: preference.preference_value,
    category: preference.category ?? undefined,
    is_active: preference.is_active,
    created_at: toISOStringSafe(preference.created_at),
    updated_at: toISOStringSafe(preference.updated_at),
    deleted_at: preference.deleted_at
      ? toISOStringSafe(preference.deleted_at)
      : undefined,
    customer: {
      id: preference.customer.id,
      email: preference.customer.email,
      first_name: preference.customer.first_name,
      last_name: preference.customer.last_name,
      phone_number: preference.customer.phone_number ?? undefined,
      status: preference.customer.status,
      created_at: toISOStringSafe(preference.customer.created_at),
      updated_at: preference.customer.updated_at
        ? toISOStringSafe(preference.customer.updated_at)
        : undefined,
    },
  };
}
