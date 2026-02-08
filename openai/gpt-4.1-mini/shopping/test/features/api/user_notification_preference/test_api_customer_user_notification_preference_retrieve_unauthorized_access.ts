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

export async function test_api_customer_user_notification_preference_retrieve_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Test behavior when retrieving a user notification preference by a customer who tries to access a preference that does not belong to them.
  // Step 1: Authenticate two separate customers
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuthorized = await authorize_customer_join(
    customerAConnection,
    {
      body: typia.random<
        import("@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer").IShoppingMallCustomer.IJoin
      >(),
    },
  );
  customerAConnection.headers = {
    Authorization: `Bearer ${customerAAuthorized.token.access}`,
  };
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuthorized = await authorize_customer_join(
    customerBConnection,
    {
      body: typia.random<
        import("@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer").IShoppingMallCustomer.IJoin
      >(),
    },
  );
  customerBConnection.headers = {
    Authorization: `Bearer ${customerBAuthorized.token.access}`,
  };
  // Step 2: Customer A creates a notification preference
  const preferenceA =
    await generate_random_shopping_mall_customer_user_notification_preferences_create_user_notification_preference(
      customerAConnection,
      {},
    );
  typia.assert(preferenceA);
  // Step 3: Extract UUID string to use as userNotificationPreferenceId dynamically
  let extractedId: string | undefined;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const key of Object.keys(preferenceA)) {
    const value = (preferenceA as any)[key];
    if (typeof value === "string" && uuidRegex.test(value)) {
      extractedId = value;
      break;
    }
  }
  if (!extractedId)
    throw new Error(
      "Could not extract userNotificationPreferenceId from created preference",
    );
  // Step 4: Customer B tries to retrieve Customer A's preference by extractedId
  await TestValidator.httpError(
    "Unauthorized access attempt should result in 403 Forbidden",
    403,
    async () => {
      await api.functional.shoppingMall.customer.userNotificationPreferences.at(
        customerBConnection,
        { userNotificationPreferenceId: extractedId },
      );
    },
  );
}
