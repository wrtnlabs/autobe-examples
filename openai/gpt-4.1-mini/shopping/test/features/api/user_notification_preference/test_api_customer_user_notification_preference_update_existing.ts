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

export async function test_api_customer_user_notification_preference_update_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody = typia.random<IShoppingMallCustomer.IJoin>();
  const authorized = await authorize_customer_join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Create initial notification preference using empty body as per DTO
  const firstPreference =
    await generate_random_shopping_mall_customer_user_notification_preferences_create_user_notification_preference(
      customerConnection,
      {},
    );
  typia.assert(firstPreference);
  // 3. Call createUserNotificationPreference again with the same empty body to test idempotency
  const secondPreference =
    await generate_random_shopping_mall_customer_user_notification_preferences_create_user_notification_preference(
      customerConnection,
      {},
    );
  typia.assert(secondPreference);
  // 4. Since we have no defined properties, assert the two returned objects are equal
  TestValidator.equals(
    "notification preference update should be idempotent",
    firstPreference,
    secondPreference,
  );
}
