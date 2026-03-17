import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_customer_list_by_super_admin_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register 3 customers with distinct data
  const customer1Email = typia.random<string & tags.Format<"email">>();
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {
    body: {
      email: customer1Email,
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
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
  const customer3Email = typia.random<string & tags.Format<"email">>();
  const customer3Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer3Connection, {
    body: {
      email: customer3Email,
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Call the customer list endpoint as super admin (no filters = defaults)
  const result = await api.functional.shoppingMall.superAdmin.customers.index(
    superAdminConnection,
    {
      body: {} satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(result);
  // 4. Assert pagination metadata
  TestValidator.equals("pagination.current is 1", result.pagination.current, 1);
  TestValidator.equals("pagination.limit is 20", result.pagination.limit, 20);
  TestValidator.predicate(
    "pagination.records is at least 3",
    result.pagination.records >= 3,
  );
  TestValidator.predicate(
    "pagination.pages is at least 1",
    result.pagination.pages >= 1,
  );
  // 5. Assert all 3 created customers appear in the response data
  const returnedEmails = result.data.map((c) => c.email);
  TestValidator.predicate(
    "customer1 email in response",
    returnedEmails.includes(customer1Email),
  );
  TestValidator.predicate(
    "customer2 email in response",
    returnedEmails.includes(customer2Email),
  );
  TestValidator.predicate(
    "customer3 email in response",
    returnedEmails.includes(customer3Email),
  );
  // 6. Assert descending order by createdAt (most recent first)
  for (let i = 0; i < result.data.length - 1; i++) {
    const current = new Date(result.data[i]!.createdAt).getTime();
    const next = new Date(result.data[i + 1]!.createdAt).getTime();
    TestValidator.predicate(
      `data[${i}].createdAt >= data[${i + 1}].createdAt`,
      current >= next,
    );
  }
}
