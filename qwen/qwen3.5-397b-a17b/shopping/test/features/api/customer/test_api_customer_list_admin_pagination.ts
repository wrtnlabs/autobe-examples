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

export async function test_api_customer_list_admin_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Call customer list endpoint with default pagination (empty body)
  const customerList = await api.functional.shoppingMall.admin.customers.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(customerList);
  // 3. Verify pagination metadata exists and is valid
  TestValidator.predicate(
    "pagination exists",
    customerList.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is valid",
    customerList.pagination.current >= 1,
  );
  TestValidator.predicate("limit is valid", customerList.pagination.limit >= 1);
  TestValidator.predicate(
    "records count is valid",
    customerList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    customerList.pagination.pages >= 0,
  );
  // 4. Verify data array exists
  TestValidator.predicate(
    "data array exists",
    Array.isArray(customerList.data),
  );
  // 5. Verify each customer has deleted_at as null (active customers only by default)
  // This tests the business logic that deleted customers are excluded by default
  for (const customer of customerList.data) {
    TestValidator.predicate(
      "deleted_at is null for active customers",
      customer.deleted_at === null,
    );
  }
  // 6. Verify pagination consistency
  if (customerList.pagination.records === 0) {
    TestValidator.equals(
      "pages is 0 when no records",
      customerList.pagination.pages,
      0,
    );
    TestValidator.equals(
      "data is empty when no records",
      customerList.data.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "pages calculation is correct",
      customerList.pagination.pages ===
        Math.ceil(
          customerList.pagination.records / customerList.pagination.limit,
        ),
    );
    TestValidator.predicate(
      "data length does not exceed limit",
      customerList.data.length <= customerList.pagination.limit,
    );
  }
}
