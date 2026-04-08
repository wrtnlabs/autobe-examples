import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_customer_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator joins
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {});
  // 2. Send customer listing request with default pagination
  const response =
    await api.functional.ecommerceMall.superAdministrator.customers.index(
      superAdminConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  const { current, limit, records, pages } = response.pagination;
  TestValidator.equals("current page", current, 1);
  TestValidator.equals("limit", limit, 20);
  TestValidator.predicate("records non-negative", records >= 0);
  TestValidator.predicate("pages non-negative", pages >= 0);
  TestValidator.equals("pages calculation", pages, Math.ceil(records / limit));
  // 4. Validate customer data
  const customers = response.data;
  for (const customer of customers) {
    typia.assert(customer);
    // Verify required fields exist
    TestValidator.notEquals("customer has id", customer.id, undefined);
    TestValidator.notEquals("customer has email", customer.email, undefined);
    TestValidator.notEquals(
      "customer has display_name",
      customer.display_name,
      undefined,
    );
    TestValidator.notEquals(
      "customer has phone_number",
      customer.phone_number,
      undefined,
    );
    TestValidator.notEquals(
      "customer has created_at",
      customer.created_at,
      undefined,
    );
    TestValidator.notEquals(
      "customer has updated_at",
      customer.updated_at,
      undefined,
    );
    TestValidator.notEquals(
      "customer has deleted_at",
      customer.deleted_at,
      undefined,
    );
    // Verify deleted_at is NULL for active accounts
    TestValidator.equals("customer not deleted", customer.deleted_at, null);
    // Verify email format (should be valid email)
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    TestValidator.predicate(
      "email format valid",
      emailPattern.test(customer.email),
    );
    // Verify id is UUID format
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    TestValidator.predicate("id format valid", uuidPattern.test(customer.id));
  }
  // 5. Verify sorting - created_at DESC (newest first)
  if (customers.length > 1) {
    for (let i = 0; i < customers.length - 1; i++) {
      const currentCustomer = customers[i];
      const nextCustomer = customers[i + 1];
      TestValidator.predicate(
        `sorting order correct (${i} vs ${i + 1})`,
        new Date(currentCustomer.created_at) >=
          new Date(nextCustomer.created_at),
      );
    }
  }
}
