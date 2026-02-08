import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallUserNotificationPreferenceCollector } from "../collectors/ShoppingMallUserNotificationPreferenceCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerUserNotificationPreferences(props: {
  customer: CustomerPayload;
  body: IShoppingMallUserNotificationPreference.ICreate;
}): Promise<IShoppingMallUserNotificationPreference> {
  const { customer, body } = props;
  // Extract ownership IDs safely with type casting
  const customerId = (body as any).customer_id ?? null;
  const sellerId = (body as any).seller_id ?? null;
  const administratorId = (body as any).administrator_id ?? null;
  const ownershipIds = [customerId, sellerId, administratorId].filter(
    (id) => id !== null && id !== undefined,
  );
  if (ownershipIds.length !== 1) {
    throw new HttpException(
      "Must specify exactly one ownership ID among customer_id, seller_id, administrator_id",
      403,
    );
  }
  // Extract channel_name and notification_type with casting
  const channelName = (body as any).channel_name;
  const notificationType = (body as any).notification_type;
  // Construct unique where condition
  let whereCondition: Prisma.shopping_mall_user_notification_preferencesWhereUniqueInput;
  if (customerId) {
    whereCondition = {
      customer_id_channel_name_notification_type: {
        customer_id: customerId,
        channel_name: channelName,
        notification_type: notificationType,
      },
    };
  } else if (sellerId) {
    whereCondition = {
      seller_id_channel_name_notification_type: {
        seller_id: sellerId,
        channel_name: channelName,
        notification_type: notificationType,
      },
    };
  } else {
    whereCondition = {
      administrator_id_channel_name_notification_type: {
        administrator_id: administratorId!,
        channel_name: channelName,
        notification_type: notificationType,
      },
    };
  }
  // Use toISOStringSafe with new Date() as argument
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Collect data
  const collectedData =
    await ShoppingMallUserNotificationPreferenceCollector.collect({ body });
  // Connect ownership
  if (customerId) {
    (collectedData as any).customer = { connect: { id: customerId } };
  } else if (sellerId) {
    (collectedData as any).seller = { connect: { id: sellerId } };
  } else {
    (collectedData as any).administrator = {
      connect: { id: administratorId! },
    };
  }
  collectedData.created_at = now;
  collectedData.updated_at = now;
  const isEnabled = (body as any).is_enabled;
  const deletedAt = (body as any).deleted_at ?? null;
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    const existing =
      await prisma.shopping_mall_user_notification_preferences.findUnique({
        where: whereCondition,
      });
    if (existing) {
      return prisma.shopping_mall_user_notification_preferences.update({
        where: whereCondition,
        data: {
          is_enabled: isEnabled,
          updated_at: now,
          deleted_at: deletedAt,
        },
      });
    } else {
      return prisma.shopping_mall_user_notification_preferences.create({
        data: collectedData,
      });
    }
  });
  return {
    id: result.id,
    customer_id: result.customer_id ?? undefined,
    seller_id: result.seller_id ?? undefined,
    administrator_id: result.administrator_id ?? undefined,
    channel_name: result.channel_name,
    notification_type: result.notification_type,
    is_enabled: result.is_enabled,
    created_at: result.created_at,
    updated_at: result.updated_at,
    deleted_at: result.deleted_at ?? undefined,
  };
}
