import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_customer_list_by_admin_no_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register two customer accounts
  const customer1Email = typia.random<string & tags.Format<"email">>();
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {
    body: {
      email: customer1Email,
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(1),
      phone: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {
    body: {
      email: customer2Email,
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(1),
      phone: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. As admin, retrieve all customers without any filters
  const page = await api.functional.shoppingMall.admin.customers.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(page);
  // 4. Verify default pagination values
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 20);
  // 5. Verify records count is at least 2 (we registered 2 customers)
  TestValidator.predicate("records at least 2", page.pagination.records >= 2);
  // 6. Verify pagination consistency: pages = ceil(records / limit)
  const expectedPages = Math.ceil(
    page.pagination.records / page.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages consistency",
    page.pagination.pages,
    expectedPages,
  );
  // 7. Verify at least one of the registered customers appears in the data
  const foundCustomer1 = page.data.some((c) => c.email === customer1Email);
  const foundCustomer2 = page.data.some((c) => c.email === customer2Email);
  TestValidator.predicate("customer1 found in list", foundCustomer1);
  TestValidator.predicate("customer2 found in list", foundCustomer2);
}
