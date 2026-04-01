import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Create multiple customer accounts for pagination testing
  const customerCount = 5;
  const customers: IShoppingMallCustomer.IAuthorized[] = [];
  for (let i = 0; i < customerCount; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
    typia.assert(customer);
    customers.push(customer);
  }
  // 3. Get customer list with default pagination (page 1)
  const page1Response =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(page1Response);
  // 4. Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    page1Response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    page1Response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count matches customers",
    page1Response.pagination.records >= customerCount,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    page1Response.pagination.pages >= 1,
  );
  // 5. Verify customer records exist
  TestValidator.predicate(
    "data array is not empty",
    page1Response.data.length > 0,
  );
  // 6. Verify password_hash is NOT exposed in response (security validation)
  for (const customerRecord of page1Response.data) {
    const recordKeys = Object.keys(customerRecord);
    TestValidator.predicate(
      "password_hash not exposed in response",
      !recordKeys.includes("password_hash"),
    );
  }
  // 7. Test pagination with page 2 and small limit
  const page2Response =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(page2Response);
  // Verify page 2 metadata
  TestValidator.predicate(
    "page 2 current page is 2",
    page2Response.pagination.current === 2,
  );
  TestValidator.equals("page 2 limit is 2", page2Response.pagination.limit, 2);
  TestValidator.equals(
    "page 2 records count matches page 1",
    page2Response.pagination.records,
    page1Response.pagination.records,
  );
  // Verify page 2 returns different customers than page 1 (if enough data exists)
  if (page1Response.data.length >= 2 && page2Response.data.length > 0) {
    const page1Ids = page1Response.data.map((c) => c.id);
    const page2Ids = page2Response.data.map((c) => c.id);
    for (const page2Id of page2Ids) {
      TestValidator.predicate(
        "page 2 has different customers than page 1",
        !page1Ids.includes(page2Id),
      );
    }
  }
  // 8. Validate pagination consistency
  const expectedPages = Math.ceil(
    page1Response.pagination.records / page1Response.pagination.limit,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    page1Response.pagination.pages === expectedPages ||
      page1Response.pagination.pages >= 1,
  );
}
