import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_user_notification_preference_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Register and authorize two customers
  const customer1 = await authorize_customer_join(connection, {});
  const c1Conn: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customer1.token.access },
  };
  const customer2 = await authorize_customer_join(connection, {});
  const c2Conn: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customer2.token.access },
  };
  // Generate a random UUID for preference id (simulate creation)
  const preferenceId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete preference by owner, expect 404 since it doesn't exist
  await TestValidator.httpError(
    "delete non-existent preference by owner returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.userNotificationPreferences.eraseUserNotificationPreference(
        c1Conn,
        { preferenceId },
      );
    },
  );
  // Attempt to delete preference by non-owner, expect 404
  await TestValidator.httpError(
    "delete non-existent preference by non-owner returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.userNotificationPreferences.eraseUserNotificationPreference(
        c2Conn,
        { preferenceId },
      );
    },
  );
  // Attempt to delete preference with no auth, expect 401 unauthorized
  await TestValidator.httpError(
    "delete preference without auth returns 401",
    401,
    async () => {
      await api.functional.shoppingMall.customer.userNotificationPreferences.eraseUserNotificationPreference(
        { host: connection.host },
        { preferenceId },
      );
    },
  );
}
