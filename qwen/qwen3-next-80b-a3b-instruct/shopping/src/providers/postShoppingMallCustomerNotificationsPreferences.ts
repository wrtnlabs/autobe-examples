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

export async function postShoppingMallCustomerNotificationsPreferences(props: {
  customer: CustomerPayload;
  body: IShoppingMallNotificationPreference.ICreate;
}): Promise<IShoppingMallNotificationPreference> {
  // Create the notification preference record in database
  await MyGlobal.prisma.shopping_mall_notification_preferences.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_id: props.customer.id,
      notification_type: props.body,
      email_enabled: true,
      in_app_enabled: true,
      push_enabled: null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  // Return exactly the notification_type string as specified by the DTO definition
  // IShoppingMallNotificationPreference = string, so return the input string
  return props.body;
}
