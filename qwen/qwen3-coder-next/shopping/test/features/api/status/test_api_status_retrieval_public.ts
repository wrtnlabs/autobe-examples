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

export async function test_api_status_retrieval_public(
  connection: api.IConnection,
): Promise<void> {
  // Execute the status retrieval endpoint
  const result = await api.functional.shoppingMall.customer.status(connection);
  // Validate the response structure
  typia.assert<IShoppingMallSystemConfiguration>(result);
  // Verify expected fields exist and have correct types
  TestValidator.predicate("date field exists", typeof result.date === "string");
  TestValidator.predicate(
    "total_sales_amount field exists",
    typeof result.total_sales_amount === "number",
  );
  TestValidator.predicate(
    "order_count field exists",
    typeof result.order_count === "number",
  );
}
