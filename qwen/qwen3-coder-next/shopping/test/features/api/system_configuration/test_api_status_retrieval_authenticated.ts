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

export async function test_api_status_retrieval_authenticated(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 1: Register and authenticate as customer
  await authorize_customer_join(customerConnection, {
    body: {
      email: (typia.random<string>() + "@example.com") satisfies (string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">),
      password: "1234" as string &
        tags.MinLength<8> &
        tags.MaxLength<128> &
        tags.Format<"password">,
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register" as string & tags.Format<"uri">,
      referrer: "https://google.com" as string & tags.Format<"uri">,
      ip: "192.168.1.1" as string & tags.Format<"ipv4">,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Step 2: Call status endpoint and validate response
  const status =
    await api.functional.shoppingMall.customer.status(customerConnection);
  typia.assert(status);
  // Step 3: Validate required fields exist
  TestValidator.equals("date is string", typeof status.date, "string");
  TestValidator.predicate(
    "total_sales_amount is positive",
    status.total_sales_amount >= 0,
  );
  TestValidator.equals(
    "order_count is int32",
    typeof status.order_count,
    "number",
  );
  TestValidator.predicate(
    "order_count is non-negative",
    status.order_count >= 0,
  );
}