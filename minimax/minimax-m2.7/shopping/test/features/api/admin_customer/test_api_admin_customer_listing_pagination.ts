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
 * Test admin can retrieve a paginated list of all customer accounts on the platform.
 *
 * This test validates the core admin customer listing functionality:
 * 1. Admin authentication
 * 2. Customer listing endpoint returns paginated results
 * 3. Response includes customer id, email, display_name, status, created_at
 * 4. Pagination metadata is correct (current page, total records, pages)
 * 5. Default sorting is newest first (created_at DESC)
 * 6. All customers visible by default (no status filter)
 */
export async function test_api_admin_customer_listing_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.Format<"password">
      >() satisfies string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Call customer listing endpoint with pagination
  const customerPage: IPageIEcommerceMallCustomer.ISummary =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(customerPage);
  // 3. Validate response structure
  const pagination = customerPage.pagination;
  TestValidator.equals("pagination exists", pagination !== undefined, true);
  TestValidator.equals(
    "data array exists",
    customerPage.data !== undefined,
    true,
  );
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate("limit is non-negative", pagination.limit >= 0);
  TestValidator.predicate("records is non-negative", pagination.records >= 0);
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);
  // 5. Validate data array structure if not empty
  if (customerPage.data.length > 0) {
    const firstCustomer = customerPage.data[0];
    // Validate customer summary fields exist
    TestValidator.equals(
      "customer has id",
      firstCustomer.id !== undefined,
      true,
    );
    TestValidator.equals(
      "customer has email",
      firstCustomer.email !== undefined,
      true,
    );
    TestValidator.equals(
      "customer has display_name",
      "display_name" in firstCustomer,
      true,
    );
    TestValidator.equals(
      "customer has status",
      firstCustomer.status !== undefined,
      true,
    );
    TestValidator.equals(
      "customer has created_at",
      firstCustomer.created_at !== undefined,
      true,
    );
    // Validate status is valid enum value
    TestValidator.predicate(
      "status is valid",
      firstCustomer.status === "active" || firstCustomer.status === "deleted",
    );
    // Validate customer fields have correct types
    TestValidator.predicate(
      "email is valid format",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firstCustomer.email),
    );
    // Display name can be null
    TestValidator.equals(
      "display_name is string or null",
      typeof firstCustomer.display_name === "string" ||
        firstCustomer.display_name === null,
      true,
    );
    // Validate all customers have valid structure
    for (const customer of customerPage.data) {
      typia.assert(customer);
    }
  }
  // 6. Validate pagination calculation
  if (pagination.records > 0 && pagination.limit > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pages calculation correct",
      pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals(
      "pages is 0 when no records or limit",
      pagination.pages,
      0,
    );
  }
  // 7. Test sorting - verify data is sorted by created_at DESC (newest first)
  if (customerPage.data.length > 1) {
    for (let i = 0; i < customerPage.data.length - 1; i++) {
      const current = new Date(customerPage.data[i].created_at).getTime();
      const next = new Date(customerPage.data[i + 1].created_at).getTime();
      TestValidator.predicate("customers sorted newest first", current >= next);
    }
  }
}
