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

export async function test_api_customer_user_notification_preference_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a user notification preference by its ID as a valid authenticated customer
  // 1. Customer signup and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = joinOutput.token.access;
  // 2. Create a user notification preference
  const createdPreferenceRaw =
    await generate_random_shopping_mall_customer_user_notification_preferences_create_user_notification_preference(
      customerConnection,
      {},
    );
  const createdPreference = typia.assert<unknown>(createdPreferenceRaw);
  // 3. Retrieve the created preference by ID
  const retrievedPreferenceRaw =
    await api.functional.shoppingMall.customer.userNotificationPreferences.at(
      customerConnection,
      {
        userNotificationPreferenceId: (createdPreference as any).id,
      },
    );
  const retrievedPreference = typia.assert<unknown>(retrievedPreferenceRaw);
  // 4. Validate that retrieved data matches created data
  TestValidator.equals(
    "userNotificationPreference.id",
    (retrievedPreference as any).id,
    (createdPreference as any).id,
  );
  TestValidator.equals(
    "userNotificationPreference.customer_id",
    (retrievedPreference as any).customer_id,
    (createdPreference as any).customer_id,
  );
  TestValidator.equals(
    "userNotificationPreference.seller_id",
    (retrievedPreference as any).seller_id,
    (createdPreference as any).seller_id,
  );
  TestValidator.equals(
    "userNotificationPreference.administrator_id",
    (retrievedPreference as any).administrator_id,
    (createdPreference as any).administrator_id,
  );
  TestValidator.equals(
    "userNotificationPreference.channel_name",
    (retrievedPreference as any).channel_name,
    (createdPreference as any).channel_name,
  );
  TestValidator.equals(
    "userNotificationPreference.notification_type",
    (retrievedPreference as any).notification_type,
    (createdPreference as any).notification_type,
  );
  TestValidator.equals(
    "userNotificationPreference.is_enabled",
    (retrievedPreference as any).is_enabled,
    (createdPreference as any).is_enabled,
  );
  // 5. Validate timestamps exist and are valid ISO strings
  TestValidator.predicate(
    "created_at is ISO string",
    typeof (retrievedPreference as any).created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
        (retrievedPreference as any).created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof (retrievedPreference as any).updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
        (retrievedPreference as any).updated_at,
      ),
  );
  // deleted_at can be null or ISO string
  TestValidator.predicate(
    "deleted_at is null or ISO string",
    (retrievedPreference as any).deleted_at === null ||
      (typeof (retrievedPreference as any).deleted_at === "string" &&
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
          (retrievedPreference as any).deleted_at,
        )),
  );
}
