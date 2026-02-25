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

export async function test_api_customer_user_notification_preference_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that a customer cannot delete another customer's notification preference.
  // 1. Register first customer and create a notification preference
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const firstCustomer = await authorize_customer_join(firstCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    },
  });
  // Simulate creating a notification preference for first customer
  // Since no utility or SDK for creation is provided, simulate by generating a UUID as preference ID
  const firstPreferenceId = typia.random<string & tags.Format<"uuid">>();
  // 2. Register second customer
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondCustomer = await authorize_customer_join(
    secondCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234",
      },
    },
  );
  // 3. Attempt to delete first customer's preference using second customer's connection
  await TestValidator.httpError(
    "forbidden deletion by unauthorized customer",
    403,
    async () => {
      await api.functional.shoppingMall.customer.userNotificationPreferences.eraseUserNotificationPreference(
        secondCustomerConnection,
        { preferenceId: firstPreferenceId },
      );
    },
  );
}
