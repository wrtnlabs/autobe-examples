import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallUserNotificationPreferenceCollector {
  export async function collect(props: {
    body: IShoppingMallUserNotificationPreference.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      channel_name: props.body.channelName,
      notification_type: props.body.notificationType,
      is_enabled: props.body.isEnabled,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: props.body.customerId
        ? { connect: { id: props.body.customerId } }
        : undefined,
      seller: props.body.sellerId
        ? { connect: { id: props.body.sellerId } }
        : undefined,
      administrator: props.body.administratorId
        ? { connect: { id: props.body.administratorId } }
        : undefined,
    } satisfies Prisma.shopping_mall_user_notification_preferencesCreateInput;
  }
}
