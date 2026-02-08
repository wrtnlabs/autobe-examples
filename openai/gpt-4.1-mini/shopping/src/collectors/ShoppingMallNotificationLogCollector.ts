import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallNotificationLogCollector {
  export async function collect(props: {
    body: IShoppingMallNotificationLog.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      event_type: "sent",
      event_metadata: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      notificationTemplate: undefined,
      userNotification: undefined,
    } satisfies Prisma.shopping_mall_notification_logsCreateInput;
  }
}
