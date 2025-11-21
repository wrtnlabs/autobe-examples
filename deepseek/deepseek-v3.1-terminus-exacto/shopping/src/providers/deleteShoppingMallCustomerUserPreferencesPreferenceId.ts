import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerUserPreferencesPreferenceId(props: {
  customer: CustomerPayload;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, verify the preference exists and belongs to the customer
  const preference =
    await MyGlobal.prisma.shopping_mall_user_preferences.findFirst({
      where: {
        id: props.preferenceId,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });

  if (!preference) {
    throw new HttpException(
      "Preference not found or you don't have permission to delete it",
      404,
    );
  }

  // Perform soft deletion by setting deleted_at timestamp
  // Include shopping_mall_customer_id in the where clause for additional security
  await MyGlobal.prisma.shopping_mall_user_preferences.update({
    where: {
      id: props.preferenceId,
      shopping_mall_customer_id: props.customer.id,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
