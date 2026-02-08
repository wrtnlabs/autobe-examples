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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorUserNotificationPreferences(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallUserNotificationPreference.ICreate;
}): Promise<IShoppingMallUserNotificationPreference> {
  const { administrator, body } = props;
  const collectedData =
    await ShoppingMallUserNotificationPreferenceCollector.collect({ body });
  const customerId = collectedData.customer_id ?? null;
  const sellerId = collectedData.seller_id ?? null;
  const administratorId = collectedData.administrator_id ?? null;
  const ownershipIds = [customerId, sellerId, administratorId];
  const filteredOwners = ownershipIds.filter((id) => id !== null);
  if (filteredOwners.length !== 1) {
    throw new HttpException(
      "Exactly one ownership identifier (customer_id, seller_id, administrator_id) must be provided.",
      400,
    );
  }
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  let where:
    | {
        customer_id_channel_name_notification_type: {
          customer_id: string & tags.Format<"uuid">;
          channel_name: string;
          notification_type: string;
        };
      }
    | {
        seller_id_channel_name_notification_type: {
          seller_id: string & tags.Format<"uuid">;
          channel_name: string;
          notification_type: string;
        };
      }
    | {
        administrator_id_channel_name_notification_type: {
          administrator_id: string & tags.Format<"uuid">;
          channel_name: string;
          notification_type: string;
        };
      };
  let createData: Prisma.shopping_mall_user_notification_preferencesCreateInput;
  let updateData: Prisma.shopping_mall_user_notification_preferencesUpdateInput;
  const newId = v4() as string & tags.Format<"uuid">;
  if (customerId) {
    where = {
      customer_id_channel_name_notification_type: {
        customer_id: customerId,
        channel_name: collectedData.channel_name,
        notification_type: collectedData.notification_type,
      },
    };
    createData = {
      id: newId,
      channel_name: collectedData.channel_name,
      notification_type: collectedData.notification_type,
      is_enabled: collectedData.is_enabled,
      created_at: now,
      updated_at: now,
      deleted_at: collectedData.deleted_at ?? null,
      customer: { connect: { id: customerId } },
    };
    updateData = {
      channel_name: collectedData.channel_name,
      notification_type: collectedData.notification_type,
      is_enabled: collectedData.is_enabled,
      updated_at: now,
      deleted_at: collectedData.deleted_at ?? null,
    };
  } else if (sellerId) {
    where = {
      seller_id_channel_name_notification_type: {
        seller_id: sellerId,
        channel_name: collectedData.channel_name,
        notification_type: collectedData.notification_type,
      },
    };
    createData = {
      id: newId,
      channel_name: collectedData.channel_name,
      notification_type: collectedData.notification_type,
      is_enabled: collectedData.is_enabled,
      created_at: now,
      updated_at: now,
      deleted_at: collectedData.deleted_at ?? null,
      seller: { connect: { id: sellerId } },
    };
    updateData = {
      channel_name: collectedData.channel_name,
      notification_type: collectedData.notification_type,
      is_enabled: collectedData.is_enabled,
      updated_at: now,
      deleted_at: collectedData.deleted_at ?? null,
    };
  } else {
    where = {
      administrator_id_channel_name_notification_type: {
        administrator_id: administratorId!,
        channel_name: collectedData.channel_name,
        notification_type: collectedData.notification_type,
      },
    };
    createData = {
      id: newId,
      channel_name: collectedData.channel_name,
      notification_type: collectedData.notification_type,
      is_enabled: collectedData.is_enabled,
      created_at: now,
      updated_at: now,
      deleted_at: collectedData.deleted_at ?? null,
      administrator: { connect: { id: administratorId! } },
    };
    updateData = {
      channel_name: collectedData.channel_name,
      notification_type: collectedData.notification_type,
      is_enabled: collectedData.is_enabled,
      updated_at: now,
      deleted_at: collectedData.deleted_at ?? null,
    };
  }
  try {
    const upserted =
      await MyGlobal.prisma.shopping_mall_user_notification_preferences.upsert({
        where,
        create: createData,
        update: updateData,
      });
    return {
      id: upserted.id,
      customer_id: upserted.customer_id ?? null,
      seller_id: upserted.seller_id ?? null,
      administrator_id: upserted.administrator_id ?? null,
      channel_name: upserted.channel_name,
      notification_type: upserted.notification_type,
      is_enabled: upserted.is_enabled,
      created_at: toISOStringSafe(upserted.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(upserted.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at: upserted.deleted_at
        ? (toISOStringSafe(upserted.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "User notification preference conflict exists.",
        409,
      );
    }
    throw new HttpException(
      `Failed to create or update user notification preference: \u001b[31m${error}\u001b[0m`,
      500,
    );
  }
}
