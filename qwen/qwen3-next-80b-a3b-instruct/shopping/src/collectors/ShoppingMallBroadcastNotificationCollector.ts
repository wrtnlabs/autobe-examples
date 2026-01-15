import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallBroadcastNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBroadcastNotification";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallBroadcastNotificationCollector {
  export async function collect(props: {
    body: IShoppingMallBroadcastNotification.ICreate;
  }) {
    return {
      id: v4(),
      action_type: "broadcast_notification",
      description: props.body.content,
      affected_table_name: "shopping_mall_broadcast_notifications",
      affected_record_id: null,
      ip_address: "0.0.0.0",
      created_at: new Date(),
      deleted_at: null,
      admin: {
        connect: { id: "00000000-0000-4000-8000-000000000000" },
      },
    } satisfies Prisma.shopping_mall_audit_logsCreateInput;
  }
}
