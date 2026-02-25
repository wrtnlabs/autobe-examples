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

export async function test_api_seller_user_notification_preference_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Seller join and get authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password",
      shopName: RandomGenerator.name(),
    },
  });
  sellerConnection.headers = { Authorization: `Bearer ${seller.token.access}` };
  // Create an initial notification preference owned by this seller directly by faking one (simulate or presumed existing)
  // Since there is no utility or API for creating a notification preference, we simulate one by generating a random sample with sellerId
  const initialPreference =
    typia.random<IShoppingMallUserNotificationPreference>();
  const preferenceOwnedBySeller: IShoppingMallUserNotificationPreference =
    {
      ...initialPreference,
      sellerId: seller.id,
      customerId: null,
      administratorId: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  // We assume this initial preference exists in the system for this test scenario
  // Prepare update data
  const updateBody: IShoppingMallUserNotificationPreference.IUpdate =
    {
      channelName: RandomGenerator.name(1),
      notificationType: RandomGenerator.name(1),
      isEnabled: !preferenceOwnedBySeller.isEnabled,
    };
  // Call update API
  const updatedPreference =
    await api.functional.shoppingMall.seller.userNotificationPreferences.update(
      sellerConnection,
      {
        preferenceId: preferenceOwnedBySeller.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPreference);
  // Validate response
  TestValidator.equals(
    "updated preference id",
    updatedPreference.id,
    preferenceOwnedBySeller.id,
  );
  TestValidator.equals(
    "seller id matches",
    updatedPreference.sellerId,
    seller.id,
  );
  TestValidator.equals(
    "channelName updated",
    updatedPreference.channelName,
    updateBody.channelName,
  );
  TestValidator.equals(
    "notificationType updated",
    updatedPreference.notificationType,
    updateBody.notificationType,
  );
  TestValidator.equals(
    "isEnabled updated",
    updatedPreference.isEnabled,
    updateBody.isEnabled,
  );
  // /// Edge case tests
  // Attempt to update a preference ID belonging to another seller
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSeller = await authorize_seller_join(otherSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password",
      shopName: RandomGenerator.name(),
    },
  });
  otherSellerConnection.headers = {
    Authorization: `Bearer ${otherSeller.token.access}`,
  };
  const updateBodyOther: IShoppingMallUserNotificationPreference.IUpdate =
    {
      channelName: RandomGenerator.name(1),
      notificationType: RandomGenerator.name(1),
      isEnabled: !preferenceOwnedBySeller.isEnabled,
    };
  await TestValidator.httpError(
    "forbidden update by non-owner seller",
    403,
    async () => {
      await api.functional.shoppingMall.seller.userNotificationPreferences.update(
        otherSellerConnection,
        {
          preferenceId: preferenceOwnedBySeller.id,
          body: updateBodyOther,
        },
      );
    },
  );
  // Attempt to update a non-existent preferenceId
  const fakePreferenceId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "update non-existent preference returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.userNotificationPreferences.update(
        sellerConnection,
        {
          preferenceId: fakePreferenceId,
          body: updateBody,
        },
      );
    },
  );
}
