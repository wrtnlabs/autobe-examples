import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationPreference";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerNotificationsPreferencesPreferenceId(props: {
  customer: CustomerPayload;
  preferenceId: string & tags.Format<"uuid">;
  body: IShoppingMallNotificationPreference.IUpdate;
}): Promise<IShoppingMallNotificationPreference> {
  // Verify preference exists and belongs to customer
  const preference =
    await MyGlobal.prisma.shopping_mall_notification_preferences.findUnique({
      where: {
        id: props.preferenceId,
        actor_id: props.customer.id,
        deleted_at: null,
      },
    });

  if (!preference) {
    throw new HttpException("Notification preference not found", 404);
  }

  // Parse the body string as JSON since IShoppingMallNotificationPreference.IUpdate is a string
  let updateBody: any;
  try {
    updateBody = JSON.parse(props.body);
  } catch (error) {
    throw new HttpException(
      "Invalid JSON in notification preference update body",
      400,
    );
  }

  // Build update data based on the parsed JSON object
  const updateData: any = {};

  if (updateBody.notification_type !== undefined) {
    updateData.notification_type = updateBody.notification_type;
  }

  if (updateBody.email_enabled !== undefined) {
    updateData.email_enabled = updateBody.email_enabled;
  }

  if (updateBody.in_app_enabled !== undefined) {
    updateData.in_app_enabled = updateBody.in_app_enabled;
  }

  if (updateBody.push_enabled !== undefined) {
    updateData.push_enabled = updateBody.push_enabled;
  }

  updateData.updated_at = toISOStringSafe(new Date());

  // Update preference with the precise update fields
  const updated =
    await MyGlobal.prisma.shopping_mall_notification_preferences.update({
      where: { id: props.preferenceId },
      data: updateData,
    });

  // Return the updated object as JSON string to match the IShoppingMallNotificationPreference string type
  return JSON.stringify(updated);
}
