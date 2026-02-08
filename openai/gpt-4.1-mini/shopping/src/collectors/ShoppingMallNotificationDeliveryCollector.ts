import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationDelivery";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallNotificationDeliveryCollector {
  export async function collect(props: {
    body: {
      channel: string;
      status: string;
      attemptedAt: Date;
      deliveredAt?: Date | null;
    };
    userNotification: {
      id: string;
    };
    notificationTemplate: {
      id: string;
    };
  }) {
    const id: string = (globalThis as any).v4();
    return {
      id,
      channel: props.body.channel,
      status: props.body.status,
      attempted_at: props.body.attemptedAt,
      delivered_at: props.body.deliveredAt ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      userNotification: { connect: { id: props.userNotification.id } },
      notificationTemplate: { connect: { id: props.notificationTemplate.id } },
    } satisfies Prisma.shopping_mall_notification_deliveriesCreateInput;
  }
}
