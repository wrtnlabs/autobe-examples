import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test deletion of seller user notification preference: successful own deletion, unauthorized deletion by other seller, and not found deletion.
 *
 * Scenarios:
 * 1. Seller deletes own user notification preference successfully.
 * 2. Unauthorized seller deletion attempt results in unauthorized error.
 * 3. Deletion using a nonexistent UUID results in not found error.
 *
 * Prerequisites include seller registration and authentication.
 */
export async function test_api_seller_user_notification_preference_erase_success_unauthorized_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A joins and authenticates
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {},
  });
  sellerAConnection.headers = {
    Authorization: `Bearer ${sellerAAuth.token.access}`,
  };
  // 2. Seller B joins and authenticates
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {},
  });
  sellerBConnection.headers = {
    Authorization: `Bearer ${sellerBAuth.token.access}`,
  };
  // 3. Seller A creates a user notification preference - no creation API given, so simulate by assuming a UUID returned (must use random UUID)
  // Since userNotificationPreferences creation API is not given, we simulate a UUID creation for testing deleting
  const userNotificationPreferenceId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Assume the notification preference belongs to seller A
  // 4. Seller A deletes own user notification preference successfully
  await api.functional.shoppingMall.seller.userNotificationPreferences.erase(
    sellerAConnection,
    {
      userNotificationPreferenceId,
    },
  );
  // 5. Attempt to delete again should result in not found error
  await TestValidator.httpError(
    "deleting already deleted preference returns not found",
    404,
    async () => {
      await api.functional.shoppingMall.seller.userNotificationPreferences.erase(
        sellerAConnection,
        {
          userNotificationPreferenceId,
        },
      );
    },
  );
  // 6. Seller A creates another notification preference (simulate UUID)
  const anotherPreferenceId = typia.random<string & tags.Format<"uuid">>();
  // 7. Seller B attempts to delete Seller A's notification preference - unauthorized
  await TestValidator.httpError(
    "unauthorized deletion attempt by different seller",
    401,
    async () => {
      await api.functional.shoppingMall.seller.userNotificationPreferences.erase(
        sellerBConnection,
        {
          userNotificationPreferenceId: anotherPreferenceId,
        },
      );
    },
  );
  // 8. Delete non-existing UUID by seller A - not found error
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deleting non-existing UUID returns not found",
    404,
    async () => {
      await api.functional.shoppingMall.seller.userNotificationPreferences.erase(
        sellerAConnection,
        {
          userNotificationPreferenceId: randomUuid,
        },
      );
    },
  );
}
