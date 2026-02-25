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

export async function test_api_seller_user_notification_preference_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  /*
    Test Scenario 3: Deletion attempt of a user notification preference with non-existent preferenceId.
    - Precondition: Seller is authorized by registration.
    - When the seller issues DELETE request with a preferenceId that does not exist in the system,
    - Then the system returns an HTTP 404 Not Found response indicating the resource was not found.
    - This test case validates the system's proper error handling for invalid resource deletion.
    */
  // Create a new connection for seller join
  const sellerConnection: api.IConnection = { host: connection.host };
  // Register and authorize a new seller
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      shopName: "Test Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  // Update sellerConnection with Authorization header using the token
  sellerConnection.headers = {
    Authorization: authorizedSeller.token.access,
  };
  // Generate a random UUID that does not exist as preferenceId
  const nonExistentPreferenceId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete the non-existent preference and assert HTTP 404 error
  await TestValidator.httpError(
    "deletion of non-existent user notification preference returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.userNotificationPreferences.eraseUserNotificationPreference(
        sellerConnection,
        { preferenceId: nonExistentPreferenceId },
      );
    },
  );
}
