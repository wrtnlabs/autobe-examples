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
    notificationTemplate: IEntity;
    owner: IEntity;
  }) {
    const id = v4();
    return {
      id,
      owner_type: "customer",
      title: "",
      body: "",
      url: null,
      image_url: null,
      is_read: false,
      delivered_at: null,
      read_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      notificationTemplate: { connect: { id: props.notificationTemplate.id } },
      owner: { connect: { id: props.owner.id } },
    } satisfies Prisma.shopping_mall_user_notificationsCreateInput;
  }
}
