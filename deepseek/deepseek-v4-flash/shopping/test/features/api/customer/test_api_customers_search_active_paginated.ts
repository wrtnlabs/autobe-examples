import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_customers_search_active_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(
    adminConnection,
    {},
  );
  typia.assert(adminAuth);
  // 2. Create multiple customer accounts with distinct randomized emails
  const customers: IECommerceMallCustomer.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await authorize_customer_join(customerConnection, {});
    typia.assert(customer);
    customers.push(customer);
  }
  // 3. Search active customers with email partial match and date range
  const searchKeyword: string = customers[0].email.split("@")[0] ?? "";
  const created_at_from: string = new Date(
    new Date(customers[0].created_at).getTime() - 3600000,
  ).toISOString();
  const created_at_to: string = new Date(
    new Date(customers[customers.length - 1].created_at).getTime() + 3600000,
  ).toISOString();
  const result =
    await api.functional.eCommerceMall.superAdministrator.customers.index(
      adminConnection,
      {
        body: {
          search: searchKeyword,
          created_at_from,
          created_at_to,
          deleted: false,
          page: 1,
          limit: 20,
        } satisfies IECommerceMallCustomer.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("limit per page", result.pagination.limit, 20);
  TestValidator.predicate("has records", result.pagination.records >= 1);
  TestValidator.predicate("has pages", result.pagination.pages >= 1);
  // 5. Validate each customer record structure and business logic
  for (const customer of result.data) {
    typia.assert(customer);
    TestValidator.equals("banned_at null for active", customer.banned_at, null);
    TestValidator.equals(
      "deleted_at null for active",
      customer.deleted_at,
      null,
    );
  }
  // 6. Verify sort order is created_at DESC (newest first)
  for (let i = 1; i < result.data.length; i++) {
    TestValidator.predicate(
      "sorted by created_at DESC",
      new Date(result.data[i - 1].created_at).getTime() >=
        new Date(result.data[i].created_at).getTime(),
    );
  }
}
