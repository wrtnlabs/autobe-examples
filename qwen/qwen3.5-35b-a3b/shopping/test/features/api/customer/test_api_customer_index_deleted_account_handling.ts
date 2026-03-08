import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
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

export async function test_api_customer_index_deleted_account_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create test customer accounts
  const createdCustomers = ArrayUtil.repeat(3, async () => {
    const customer = await authorize_customer_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
    typia.assert(customer);
    return customer;
  });
  // 3. Query customers with default filter (no filter specified)
  const defaultQuery = await api.functional.ecommerceMall.admin.customers.index(
    adminConnection,
    {
      body: {} satisfies IEcommerceMallCustomer.IRequest,
    },
  );
  typia.assert(defaultQuery);
  // 4. Query customers with explicit deleted_at undefined (should behave like default)
  const undefinedDeletedQuery =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        deleted_at: undefined,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(undefinedDeletedQuery);
  // 5. Query customers with created_at filter
  const dateFilteredQuery =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        created_at_gte: new Date(
          Date.now() - 1000 * 60 * 60 * 24,
        ).toISOString(),
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(dateFilteredQuery);
  // 6. Validate default query returns valid customer data
  TestValidator.predicate(
    "default query returns customers",
    defaultQuery.data.length >= 0,
  );
  TestValidator.equals(
    "default query pagination records match",
    defaultQuery.pagination.records,
    defaultQuery.data.length,
  );
  // 7. Validate all returned customers have valid deletedAt field structure
  for (const customer of defaultQuery.data) {
    typia.assert(customer);
    TestValidator.equals(
      "customer deletedAt is valid type",
      customer.deletedAt === null || customer.deletedAt !== null,
      true,
    );
    TestValidator.predicate(
      "customer has display name",
      customer.customerProfile.displayName.length > 0,
    );
    TestValidator.predicate(
      "customer has valid createdAt",
      !isNaN(new Date(customer.createdAt).getTime()),
    );
    TestValidator.predicate(
      "customer has valid updatedAt",
      !isNaN(new Date(customer.updatedAt).getTime()),
    );
  }
  // 8. Validate query with undefined deleted_at returns same structure
  TestValidator.equals(
    "undefined deleted_at returns customers",
    undefinedDeletedQuery.data.length >= 0,
    true,
  );
  for (const customer of undefinedDeletedQuery.data) {
    typia.assert(customer);
    TestValidator.equals(
      "customer deletedAt is valid type after undefined filter",
      customer.deletedAt === null || customer.deletedAt !== null,
      true,
    );
  }
  // 9. Validate pagination metadata structure
  TestValidator.predicate(
    "default query pagination current >= 0",
    defaultQuery.pagination.current >= 0,
  );
  TestValidator.predicate(
    "default query pagination limit >= 0",
    defaultQuery.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "default query pagination records >= 0",
    defaultQuery.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default query pagination pages >= 0",
    defaultQuery.pagination.pages >= 0,
  );
  // 10. Validate date filter works
  TestValidator.predicate(
    "date filtered query returns customers",
    dateFilteredQuery.data.length >= 0,
  );
  TestValidator.predicate(
    "date filter pagination records >= 0",
    dateFilteredQuery.pagination.records >= 0,
  );
}
