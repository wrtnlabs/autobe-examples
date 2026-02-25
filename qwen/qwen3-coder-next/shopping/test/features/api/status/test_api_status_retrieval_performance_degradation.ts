import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_status_retrieval_performance_degradation(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Perform customer registration to establish authentication context
  await authorize_customer_join(customerConnection, {
    body: {
      email: RandomGenerator.name() + "@test.com",
      password: "Test@12345678",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Test status endpoint
  const output: IShoppingMallSystemConfiguration =
    await api.functional.shoppingMall.customer.status(customerConnection);
  typia.assert(output);
  // Validate system configuration structure
  TestValidator.predicate(
    "has valid date format",
    () => !isNaN(Date.parse(output.date)),
  );
  TestValidator.predicate(
    "has positive total sales",
    () => output.total_sales_amount >= 0,
  );
  TestValidator.predicate(
    "has non-negative order count",
    () => output.order_count >= 0,
  );
}
