import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallUserNotificationCollector {
  export async function collect(props: {
    body: IShoppingMallUserNotification.ICreate;
  }) {
    const id = v4();
    return {
      id,
      owner_type: props.body.ownerType,
      title: props.body.title,
      body: props.body.body,
      url: props.body.url ?? null,
      image_url: props.body.imageUrl ?? null,
      is_read: props.body.isRead,
      delivered_at: props.body.deliveredAt
        ? new Date(props.body.deliveredAt)
        : null,
      read_at: props.body.readAt ? new Date(props.body.readAt) : null,
      created_at: new Date(),
      updated_at: props.body.updatedAt
        ? new Date(props.body.updatedAt)
        : new Date(),
      deleted_at: props.body.deletedAt ? new Date(props.body.deletedAt) : null,
      notificationTemplate: {
        connect: { id: props.body.notificationTemplateId },
      },
      owner: { connect: { id: props.body.ownerId } },
      notificationDeliveries: undefined,
      logs: undefined,
    } satisfies Prisma.shopping_mall_user_notificationsCreateInput;
  }
}
