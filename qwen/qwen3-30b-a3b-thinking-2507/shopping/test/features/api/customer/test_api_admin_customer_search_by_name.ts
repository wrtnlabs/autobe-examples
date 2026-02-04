import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_customer_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  // 2. Prepare search criteria using partial name match
  const search: IShoppingMallCustomer.IRequest = {
    name: "Joh",
  };
  // 3. Execute customer search API with authentication
  const results: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(adminConnection, {
      body: search,
    });
  typia.assert(results);
  // 4. Validate search results contain expected customers
  const customerNames = results.data.map((c) => c.name);
  const containsJohn = customerNames.some((name) =>
    name.toLowerCase().includes("john"),
  );
  const containsJonathan = customerNames.some((name) =>
    name.toLowerCase().includes("jonathan"),
  );
  // Validate positive search results
  TestValidator.predicate(
    "Search results should contain customers with 'John' or 'Jonathan' in their name",
    containsJohn && containsJonathan,
  );
  // Validate results are not empty
  TestValidator.predicate(
    "Search should return at least one matching record",
    results.data.length > 0,
  );
  // Validate no unrelated customers are returned (negative test not needed in this specific case as we're testing a specific partial match)
  // In real tests, we'd want to verify 'Smith' alone wouldn't find John Doe or Jonathan Smith
}
