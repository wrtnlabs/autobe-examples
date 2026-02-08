import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_notification_template } from "../prepare/prepare_random_shopping_mall_notification_template";

export async function generate_random_shopping_mall_administrator_notification_templates_create_notification_template(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallNotificationTemplate.ICreate> | undefined;
  },
): Promise<IShoppingMallNotificationTemplate> {
  const prepared: IShoppingMallNotificationTemplate.ICreate =
    prepare_random_shopping_mall_notification_template(props.body);
  return await api.functional.shoppingMall.administrator.notificationTemplates.createNotificationTemplate(
    connection,
    {
      body: prepared,
    },
  );
}
