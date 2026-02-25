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
import { generate_random_shopping_mall_seller_user_notification_preferences_create } from "../../../generate/generate_random_shopping_mall_seller_user_notification_preferences_create";
import { prepare_random_shopping_mall_user_notification_preference } from "../../../prepare/prepare_random_shopping_mall_user_notification_preference";

export async function test_api_seller_user_notification_preference_retrieval_success_authorization_error_notfound(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve a user notification preference by seller owner.
  // - Authenticate as a new seller using the join operation.
  // - Create a user notification preference for this seller.
  // - Retrieve the created notification preference by its preferenceId.
  // - Validate that the returned details match the created preference including channelName, notificationType, and isEnabled.
  // - Confirm the seller identity matches and no unauthorized data is included.
  // - Confirm timestamps (createdAt, updatedAt) are present.
  // Scenario 2: Attempt to retrieve a user notification preference that belongs to another seller (authorization failure).
  // - Authenticate as a first seller and create a notification preference.
  // - Authenticate as a second seller.
  // - Attempt to retrieve the first seller's notification preference by its preferenceId.
  // - Validate that the operation returns an authorization error (e.g., HTTP 403 Forbidden).
  // Scenario 3: Attempt to retrieve a non-existent user notification preference.
  // - Authenticate as a seller.
  // - Attempt to retrieve a notification preference using a random UUID that does not exist in the database.
  // - Validate that the operation returns a not found error (e.g., HTTP 404 Not Found).
  // Prepare actor-specific connections and utilize utility functions exclusively.
  // Use typia.assert() for response validation and TestValidator for business logic assertions.
  // Implement scenarios below with tagged step comments.
  // <E2E TEST CODE HERE>
  // 1. Seller Join and Create Preference (seller1)
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Join = await authorize_seller_join(seller1Connection, {
    body: {},
  });
  seller1Connection.headers = { Authorization: seller1Join.token.access };
  const preference1 =
    await generate_random_shopping_mall_seller_user_notification_preferences_create(
      seller1Connection,
      { body: { sellerId: seller1Join.id } },
    );
  typia.assert(preference1);
  TestValidator.equals(
    "sellerId matches preference owner",
    preference1.sellerId,
    seller1Join.id,
  );
  // Retrieve the preference by seller1
  const retrieved1 =
    await api.functional.shoppingMall.seller.userNotificationPreferences.at(
      seller1Connection,
      { preferenceId: preference1.id },
    );
  typia.assert(retrieved1);
  TestValidator.equals(
    "retrieved preference matches created",
    retrieved1.id,
    preference1.id,
  );
  TestValidator.equals(
    "channelName matches",
    retrieved1.channelName,
    preference1.channelName,
  );
  TestValidator.equals(
    "notificationType matches",
    retrieved1.notificationType,
    preference1.notificationType,
  );
  TestValidator.equals(
    "isEnabled matches",
    retrieved1.isEnabled,
    preference1.isEnabled,
  );
  TestValidator.equals("sellerId matches", retrieved1.sellerId, seller1Join.id);
  TestValidator.predicate(
    "createdAt present",
    typeof retrieved1.createdAt === "string" && retrieved1.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt present",
    typeof retrieved1.updatedAt === "string" && retrieved1.updatedAt.length > 0,
  );
  // 2. Authorize failure: seller2 tries to access seller1 preference
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Join = await authorize_seller_join(seller2Connection, {
    body: {},
  });
  seller2Connection.headers = { Authorization: seller2Join.token.access };
  await TestValidator.httpError(
    "authorization failure on other seller preference retrieval",
    403,
    async () => {
      await api.functional.shoppingMall.seller.userNotificationPreferences.at(
        seller2Connection,
        { preferenceId: preference1.id },
      );
    },
  );
  // 3. Not found error: seller tries to retrieve random non-existent preference
  const randomNonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "not found error on non-existent preference retrieval",
    404,
    async () => {
      await api.functional.shoppingMall.seller.userNotificationPreferences.at(
        seller1Connection,
        { preferenceId: randomNonExistentId },
      );
    },
  );
}
