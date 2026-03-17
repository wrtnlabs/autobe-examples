import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_customer_roster_administrator_default_browsing(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(administrator);
  const page = await api.functional.shoppingMall.customers.index(
    administratorConnection,
    {
      body: {} satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "page data length does not exceed pagination limit",
    page.data.length <= page.pagination.limit,
  );
  TestValidator.predicate(
    "current page is non-negative",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    page.pagination.records >= 0,
  );
  if (page.pagination.pages === 0) {
    TestValidator.equals("no records implies empty data", page.data.length, 0);
  }
  const ids = new Set<string>();
  for (const customer of page.data) {
    typia.assert<IShoppingMallCustomer.ISummary>(customer);
    TestValidator.predicate(
      "customer id is unique within page",
      ids.has(customer.id) === false,
    );
    ids.add(customer.id);
    TestValidator.predicate(
      "customer updated_at is not earlier than created_at",
      new Date(customer.updated_at).getTime() >=
        new Date(customer.created_at).getTime(),
    );
    TestValidator.equals(
      "password hash is not exposed",
      Object.prototype.hasOwnProperty.call(customer, "password_hash"),
      false,
    );
  }
  for (let i = 1; i < page.data.length; ++i) {
    TestValidator.predicate(
      "default ordering is newest registrations first",
      new Date(page.data[i - 1].created_at).getTime() >=
        new Date(page.data[i].created_at).getTime(),
    );
  }
}
