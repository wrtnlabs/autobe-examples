import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_notification_log } from "../prepare/prepare_random_shopping_mall_notification_log";

export async function generate_random_shopping_mall_administrator_notification_logs_create_notification_log(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallNotificationLog.ICreate> | undefined;
  },
): Promise<IShoppingMallNotificationLog> {
  const prepared: IShoppingMallNotificationLog.ICreate =
    prepare_random_shopping_mall_notification_log(props.body);
  const result: IShoppingMallNotificationLog =
    await api.functional.shoppingMall.administrator.notificationLogs.createNotificationLog(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
