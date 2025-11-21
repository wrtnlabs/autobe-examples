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

export async function putShoppingMallCustomerUserPreferencesPreferenceId(props: {
  customer: CustomerPayload;
  preferenceId: string & tags.Format<"uuid">;
  body: IShoppingMallUserPreference.IUpdate;
}): Promise<IShoppingMallUserPreference> {
  // Verify the preference exists and belongs to the customer
  const existingPreference =
    await MyGlobal.prisma.shopping_mall_user_preferences.findFirst({
      where: {
        id: props.preferenceId,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      include: {
        customer: true,
      },
    });

  if (!existingPreference) {
    throw new HttpException("Preference not found", 404);
  }

  // Update the preference with inline parameters
  const updated = await MyGlobal.prisma.shopping_mall_user_preferences.update({
    where: { id: props.preferenceId },
    data: {
      preference_value:
        props.body.preference_value ?? existingPreference.preference_value,
      category: props.body.category ?? existingPreference.category,
      is_active: props.body.is_active ?? existingPreference.is_active,
      updated_at: toISOStringSafe(new Date()),
    },
    include: {
      customer: true,
    },
  });

  // Convert to API response format with proper null/undefined handling
  return {
    id: updated.id,
    preference_type: updated.preference_type,
    preference_key: updated.preference_key,
    preference_value: updated.preference_value,
    category: updated.category ?? undefined, // Convert null to undefined for optional field
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    customer: {
      id: updated.customer.id,
      email: updated.customer.email,
      first_name: updated.customer.first_name,
      last_name: updated.customer.last_name,
      phone_number: updated.customer.phone_number ?? undefined,
      status: updated.customer.status,
      created_at: toISOStringSafe(updated.customer.created_at),
      updated_at: updated.customer.updated_at
        ? toISOStringSafe(updated.customer.updated_at)
        : undefined,
    },
  };
}
