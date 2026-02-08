import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_notification_templates_create_notification_template } from "../../../generate/generate_random_shopping_mall_administrator_notification_templates_create_notification_template";
import { generate_random_shopping_mall_administrator_user_notifications_create_user_notification } from "../../../generate/generate_random_shopping_mall_administrator_user_notifications_create_user_notification";
import { prepare_random_shopping_mall_notification_template } from "../../../prepare/prepare_random_shopping_mall_notification_template";
import { prepare_random_shopping_mall_user_notification } from "../../../prepare/prepare_random_shopping_mall_user_notification";

export async function test_api_user_notification_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Administrator join and obtain authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: typia.random<IShoppingMallAdministrator.IJoin>(),
  });
  typia.assert(adminAuth);
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // Create a notification template prerequisite
  const templateRaw =
    await generate_random_shopping_mall_administrator_notification_templates_create_notification_template(
      adminConnection,
      {},
    );
  typia.assert(templateRaw);
  // Prepare user notification creation body referencing template
  // Since no properties exist in IShoppingMallNotificationTemplate or IShoppingMallUserNotification, only call creation API
  // with minimal body. We use typia.random for required structure if any.
  const notificationBody =
    typia.random<IShoppingMallUserNotification.ICreate>();
  // Create the user notification
  const notificationRaw =
    await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
      adminConnection,
      {
        body: notificationBody,
      },
    );
  typia.assert(notificationRaw);
  // Validate creation success by asserting types only
  TestValidator.predicate(
    "administrator authorization succeeded",
    !!adminAuth.token.access,
  );
  TestValidator.predicate(
    "notification template creation succeeded",
    !!templateRaw,
  );
  TestValidator.predicate(
    "user notification creation succeeded",
    !!notificationRaw,
  );
}
