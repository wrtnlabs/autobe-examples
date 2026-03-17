import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

/**
 * Test customer listing with pagination functionality for administrators.
 * Tests retrieval of filtered and paginated customer accounts via admin endpoint.
 */
export async function test_api_customer_listing_active_with_pagination(
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
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create admin-specific connection with token
  const adminAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminAuth.token.access}` },
  };
  // 2. Call customer listing endpoint with default pagination
  const customerList = await api.functional.ecommerceMall.admin.customers.index(
    adminAuthConnection,
    {
      body: {},
    },
  );
  typia.assert(customerList);
  // 3. Verify response structure - IPageIEcommerceMallCustomer.ISummary
  TestValidator.equals(
    "response has data array",
    customerList.data?.length >= 0,
    true,
  );
  TestValidator.equals(
    "response has pagination metadata",
    customerList.pagination !== undefined,
    true,
  );
  // 4. Verify pagination metadata structure and values
  const pagination = customerList.pagination;
  TestValidator.equals("pagination current page", pagination.current, 1);
  TestValidator.equals("pagination limit", pagination.limit, 20);
  TestValidator.predicate(
    "pagination limit is between 1 and 100",
    pagination.limit >= 1 && pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );
  // 5. Verify customer summary fields and no sensitive data
  for (const customer of customerList.data) {
    typia.assert(customer);
    // Verify required fields exist
    TestValidator.predicate(
      "customer has valid UUID id",
      /^[0-9a-f-]{36}$/i.test(customer.id),
    );
    TestValidator.predicate(
      "customer has formatted email",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email),
    );
    TestValidator.predicate(
      "customer has status field",
      ["active", "suspended", "deleted"].includes(customer.status),
    );
    TestValidator.predicate(
      "customer has valid ISO datetime created_at",
      !Number.isNaN(Date.parse(customer.created_at)),
    );
    TestValidator.predicate(
      "customer deleted_at is ISO datetime or null",
      customer.deleted_at === null ||
        !Number.isNaN(Date.parse(customer.deleted_at)),
    );
    // Verify NO sensitive fields are present
    const sensitiveFields = ["password_hash", "password", "token"];
    for (const field of sensitiveFields) {
      TestValidator.notEquals(
        `customer should not have sensitive field ${field}`,
        (customer as any)[field] !== undefined,
        true,
      );
    }
  }
  // 6. Verify sorting - customers should be sorted by created_at DESC
  if (customerList.data.length > 1) {
    const sortedByCreatedDesc = customerList.data.every((customer, index) => {
      if (index === 0) return true;
      const prevCustomer = customerList.data[index - 1];
      return (
        Date.parse(customer.created_at) <= Date.parse(prevCustomer.created_at)
      );
    });
    TestValidator.predicate(
      "customers are sorted by created_at descending",
      sortedByCreatedDesc,
    );
  }
  // 7. Verify soft-deleted customers are excluded (deleted_at IS NOT NULL)
  for (const customer of customerList.data) {
    TestValidator.predicate(
      "customer is not soft-deleted (deleted_at should be null)",
      customer.deleted_at === null,
    );
  }
}