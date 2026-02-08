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

export async function test_api_user_notification_preference_update_authorized_seller_and_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Prepare first seller and authenticate
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Authorized = await authorize_seller_join(seller1Connection, {
    body: {},
  });
  seller1Connection.headers = {
    Authorization: `Bearer ${seller1Authorized.token.access}`,
  };
  // Prepare second seller and authenticate
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Authorized = await authorize_seller_join(seller2Connection, {
    body: {},
  });
  seller2Connection.headers = {
    Authorization: `Bearer ${seller2Authorized.token.access}`,
  };
  // Generate random userNotificationPreferenceId (UUID)
  const userNotificationPreferenceId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Generate update body with valid random data
  const updateBody =
    typia.random<IShoppingMallUserNotificationPreference.IUpdate>();
  // Seller1 updates the user notification preference
  const updatedPreference =
    await api.functional.shoppingMall.seller.userNotificationPreferences.update(
      seller1Connection,
      {
        userNotificationPreferenceId,
        body: updateBody,
      },
    );
  typia.assert(updatedPreference);
  // Seller2 attempts unauthorized update, expect error
  await TestValidator.error(
    "Unauthorized update attempt by another seller",
    async () => {
      await api.functional.shoppingMall.seller.userNotificationPreferences.update(
        seller2Connection,
        {
          userNotificationPreferenceId,
          body: updateBody,
        },
      );
    },
  );
  // Seller1 updates again with the same data to confirm persistence
  const reupdatedPreference =
    await api.functional.shoppingMall.seller.userNotificationPreferences.update(
      seller1Connection,
      {
        userNotificationPreferenceId,
        body: updateBody,
      },
    );
  typia.assert(reupdatedPreference);
  TestValidator.equals(
    "Re-updated preference matches update body",
    reupdatedPreference,
    updatedPreference,
  );
}
