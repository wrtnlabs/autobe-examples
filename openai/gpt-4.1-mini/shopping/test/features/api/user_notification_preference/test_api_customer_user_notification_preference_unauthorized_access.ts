import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_user_notification_preferences_create_user_notification_preference } from "../../../generate/generate_random_shopping_mall_customer_user_notification_preferences_create_user_notification_preference";
import { prepare_random_shopping_mall_user_notification_preference } from "../../../prepare/prepare_random_shopping_mall_user_notification_preference";

export async function test_api_customer_user_notification_preference_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Unauthorized creation or update should be rejected
  // 1. Register two distinct customers
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: typia.random<
      import("@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer").IShoppingMallCustomer.IJoin
    >(),
  });
  typia.assert(customerA);
  const customerB = await authorize_customer_join(customerBConnection, {
    body: typia.random<
      import("@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer").IShoppingMallCustomer.IJoin
    >(),
  });
  typia.assert(customerB);
  // Attempt to create or update user notification preference with customerAConnection
  // where body is generated randomly according to empty ICreate schema
  const body =
    typia.random<
      import("@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference").IShoppingMallUserNotificationPreference.ICreate
    >();
  await TestValidator.httpError(
    "unauthorized creation or update",
    403,
    async () => {
      await generate_random_shopping_mall_customer_user_notification_preferences_create_user_notification_preference(
        customerAConnection,
        { body },
      );
    },
  );
}
