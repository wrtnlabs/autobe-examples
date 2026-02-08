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

export async function test_api_customer_user_notification_preference_create_new(
  connection: api.IConnection,
): Promise<void> {
  // Test creating a new user notification preference for a newly registered customer
  // Step 1: Customer registration and authorization
  const customerJoinConnection: api.IConnection = { host: connection.host };
  // IShoppingMallCustomer.IJoin is empty, so send empty object
  const authorized: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerJoinConnection, {
      body: {},
    });
  typia.assert(authorized);
  // Create a new connection with Authorization header
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Step 2: Call generation function to create a random notification preference for the authorized customer
  const preference =
    await generate_random_shopping_mall_customer_user_notification_preferences_create_user_notification_preference(
      customerConnection,
      { body: undefined },
    );
  typia.assert(preference);
  // Step 3: Validate the preference object is truthy (as we cannot validate specific nonexistent properties)
  TestValidator.predicate("preference object is defined", preference !== undefined && preference !== null);
}