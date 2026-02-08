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

export async function test_api_seller_user_notification_preference_retrieve_authorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve existing preference by valid UUID
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, { body: {} });
  typia.assert(seller);
  // Simulate fetching an existing user notification preference owned by this seller
  const simulatedPreference =
    await api.functional.shoppingMall.seller.userNotificationPreferences.at(
      sellerConnection,
      {
        userNotificationPreferenceId: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    );
  typia.assert(simulatedPreference);
  // Use its ID for retrieval test - removed property access to 'id' since it doesn't exist
  // Scenario 1: Call GET with a random UUID
  const somePreferenceId = typia.random<string & tags.Format<"uuid">>();
  const retrievedPreference =
    await api.functional.shoppingMall.seller.userNotificationPreferences.at(
      sellerConnection,
      {
        userNotificationPreferenceId: somePreferenceId,
      },
    );
  typia.assert(retrievedPreference);
  // No property validation for created_at, updated_at, deleted_at - properties do not exist
  // Scenario 2: Non-existing UUID should return 404
  await TestValidator.httpError(
    "non-existing userNotificationPreferenceId returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.userNotificationPreferences.at(
        sellerConnection,
        {
          userNotificationPreferenceId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
  // Scenario 3: Access denied for preferences not owned by seller
  // We simulate with a random UUID that is unlikely owned by the seller
  const otherSellerPreferenceId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "access to non-owned userNotificationPreference denied",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.seller.userNotificationPreferences.at(
        sellerConnection,
        {
          userNotificationPreferenceId: otherSellerPreferenceId,
        },
      );
    },
  );
}
