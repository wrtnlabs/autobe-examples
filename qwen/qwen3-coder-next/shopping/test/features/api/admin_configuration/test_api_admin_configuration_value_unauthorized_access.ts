import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import type { IShoppingMallSystemConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfigurationValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_admin_configuration_value_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a regular customer account (unauthorized user)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(unauthorizedConnection, {
    body: {
      email: typia.random<string>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://google.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Attempt unauthorized configuration update
  const updateData = {
    configuration_id: typia.random<string & tags.Format<"uuid">>(),
    value_string: "test_value",
  } satisfies IShoppingMallSystemConfigurationValue.IUpdate;
  // 3. Verify unauthorized access is properly rejected
  await TestValidator.error(
    "should reject unauthorized configuration update",
    async () => {
      await api.functional.shoppingMall.admin.configuration_values.updateConfiguration(
        unauthorizedConnection,
        { body: updateData },
      );
    },
  );
}
