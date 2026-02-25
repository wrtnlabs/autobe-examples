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
import { generate_random_shopping_mall_customer_user_notification_preferences_create } from "../../../generate/generate_random_shopping_mall_customer_user_notification_preferences_create";
import { prepare_random_shopping_mall_user_notification_preference } from "../../../prepare/prepare_random_shopping_mall_user_notification_preference";

export async function test_api_customer_user_notification_preference_create_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that creating a user notification preference without authentication fails with a 401 Unauthorized error.
  // We do not authorize the connection intentionally to test unauthorized access.
  // Prepare a random user notification preference creation data.
  const body = typia.random<IShoppingMallUserNotificationPreference.ICreate>();
  // Expect an HTTP 401 Unauthorized error when calling the create endpoint without authentication.
  await TestValidator.httpError(
    "create user notification preference without auth should be unauthorized",
    401,
    async () => {
      await api.functional.shoppingMall.customer.userNotificationPreferences.create(
        connection,
        { body },
      );
    },
  );
}
