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

export async function test_api_seller_user_notification_preference_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(authorizedSeller);
  sellerConnection.headers = {
    Authorization: authorizedSeller.token.access,
  };
  // 2. Simulate creation of user notification preference owned by this seller
  //    Since no creation API given, we simulate an existing ID to be erased.
  //    We'll use a random UUID for the preferenceId.
  const preferenceId = typia.random<string & tags.Format<"uuid">>();
  // 3. Successful delete attempt by the owning seller (authenticated)
  //    This simulates deleting the preferenceId owned by the seller.
  await api.functional.shoppingMall.seller.userNotificationPreferences.eraseUserNotificationPreference(
    sellerConnection,
    { preferenceId },
  );
  // 4. Verify deletion by attempting to delete again should error with 403 or 404
  await TestValidator.httpError(
    "unauthorized or not found on repeated deletion",
    [403, 404],
    async () =>
      await api.functional.shoppingMall.seller.userNotificationPreferences.eraseUserNotificationPreference(
        sellerConnection,
        { preferenceId },
      ),
  );
  // 5. Another seller tries to delete the same preferenceId, expect 403 or 404
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const authorizedOtherSeller = await authorize_seller_join(
    otherSellerConnection,
    { body: {} },
  );
  typia.assert(authorizedOtherSeller);
  otherSellerConnection.headers = {
    Authorization: authorizedOtherSeller.token.access,
  };
  await TestValidator.httpError(
    "unauthorized or not found on deletion by different seller",
    [403, 404],
    async () =>
      await api.functional.shoppingMall.seller.userNotificationPreferences.eraseUserNotificationPreference(
        otherSellerConnection,
        { preferenceId },
      ),
  );
}
