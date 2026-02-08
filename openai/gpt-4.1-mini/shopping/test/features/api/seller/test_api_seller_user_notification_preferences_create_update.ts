import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_user_notification_preferences_create_user_notification_preference } from "../../../generate/generate_random_shopping_mall_seller_user_notification_preferences_create_user_notification_preference";
import { prepare_random_shopping_mall_user_notification_preference } from "../../../prepare/prepare_random_shopping_mall_user_notification_preference";

export async function test_api_seller_user_notification_preferences_create_update(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate seller user once
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = `Bearer ${sellerAuth.token.access}`;
  // Scenario 1: Create a new notification preference for a seller
  {
    const createdPreference =
      await generate_random_shopping_mall_seller_user_notification_preferences_create_user_notification_preference(
        sellerConnection,
        { body: {} },
      );
    typia.assert(createdPreference);
  }
  // Scenario 2: Update an existing notification preference for a seller
  {
    const createdPreference =
      await generate_random_shopping_mall_seller_user_notification_preferences_create_user_notification_preference(
        sellerConnection,
        { body: {} },
      );
    typia.assert(createdPreference);
    const updatedPreference =
      await generate_random_shopping_mall_seller_user_notification_preferences_create_user_notification_preference(
        sellerConnection,
        { body: {} },
      );
    typia.assert(updatedPreference);
  }
  // Scenario 3: Concurrent upsert of notification preferences
  {
    const concurrentResults = await Promise.all([
      generate_random_shopping_mall_seller_user_notification_preferences_create_user_notification_preference(
        sellerConnection,
        { body: {} },
      ),
      generate_random_shopping_mall_seller_user_notification_preferences_create_user_notification_preference(
        sellerConnection,
        { body: {} },
      ),
    ]);
    typia.assert(concurrentResults[0]);
    typia.assert(concurrentResults[1]);
  }
}
