import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotificationPreference";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

export async function test_api_seller_user_notification_preferences_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Register a new seller and authorize
  const baseConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(baseConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "securepassword",
      shopName: "TestSellerShop",
      shopDescription: "A test seller account",
      logoUri: null,
    },
  });
  typia.assert(sellerAuthorized);
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // Scenario 1: Filter by seller_id, channel_name, notification_type, with pagination
  {
    const requestBody1 = {
      seller_id: sellerAuthorized.id,
      channel_name: "email",
      notification_type: "order_update",
      page: 1,
      limit: 10,
    } satisfies IShoppingMallUserNotificationPreference.IRequest;
    const response1 =
      await api.functional.shoppingMall.seller.userNotificationPreferences.index(
        sellerConnection,
        { body: requestBody1 },
      );
    typia.assert(response1);
    // Validate pagination metadata
    TestValidator.predicate(
      "pagination current page >= 1",
      response1.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit > 0",
      response1.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      response1.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records >= 0",
      response1.pagination.records >= 0,
    );
    // Validate that all data entries belong to requested seller and match channel and notification
    for (const pref of response1.data) {
      typia.assert(pref);
      TestValidator.equals(
        "seller_id matches",
        pref.seller?.id,
        sellerAuthorized.id,
      );
      TestValidator.equals("channel_name matches", pref.channelName, "email");
      TestValidator.equals(
        "notification_type matches",
        pref.notificationType,
        "order_update",
      );
      TestValidator.predicate(
        "is_enabled is boolean",
        typeof pref.isEnabled === "boolean",
      );
    }
  }
  // Scenario 2: Use multiple filter criteria and verify filtered response with pagination
  {
    const requestBody2 = {
      seller_id: sellerAuthorized.id,
      channel_name: "push",
      notification_type: "promotion",
      page: 2,
      limit: 5,
    } satisfies IShoppingMallUserNotificationPreference.IRequest;
    const response2 =
      await api.functional.shoppingMall.seller.userNotificationPreferences.index(
        sellerConnection,
        { body: requestBody2 },
      );
    typia.assert(response2);
    TestValidator.predicate(
      "pagination current page >= 1",
      response2.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit > 0",
      response2.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      response2.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records >= 0",
      response2.pagination.records >= 0,
    );
    for (const pref of response2.data) {
      typia.assert(pref);
      TestValidator.equals(
        "seller_id matches",
        pref.seller?.id,
        sellerAuthorized.id,
      );
      TestValidator.equals("channel_name matches", pref.channelName, "push");
      TestValidator.equals(
        "notification_type matches",
        pref.notificationType,
        "promotion",
      );
      TestValidator.predicate(
        "is_enabled is boolean",
        typeof pref.isEnabled === "boolean",
      );
    }
  }
}
