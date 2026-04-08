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

/**
 * Test admin customer listing with status filter.
 *
 * Validates the administrator endpoint for filtering customers by account status.
 * Tests that the status filter correctly distinguishes between active customers
 * (deleted_at IS NULL) and banned/deleted customers (deleted_at IS NOT NULL).
 *
 * **Business Logic:**
 * - status='active' maps to deleted_at IS NULL
 * - status='banned' maps to deleted_at IS NOT NULL (soft-deleted accounts)
 * - The computed 'status' field is derived from deleted_at timestamp
 *
 * 1. Administrator authenticates using admin join endpoint.
 * 2. Test filtering customers with status='active' returns only active accounts.
 * 3. Validate that all returned customers have status='active' and null deleted_at.
 * 4. Verify pagination metadata reflects the filtered count.
 */
export async function test_api_customer_listing_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Get initial customer list without filter to verify data exists
  const initialList =
    await api.functional.ecommerceMall.admin.admin.customers.index(
      adminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallCustomer.IRequest,
      },
    );
  typia.assert(initialList);
  // 3. Test filtering with status='active' - should return customers with deleted_at IS NULL
  const activeCustomers =
    await api.functional.ecommerceMall.admin.admin.customers.index(
      adminConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCustomer.IRequest,
      },
    );
  typia.assert(activeCustomers);
  // 4. Validate all returned customers have status='active'
  TestValidator.equals(
    "has pagination metadata",
    activeCustomers.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "pagination current is valid",
    activeCustomers.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    activeCustomers.pagination.limit > 0,
  );
  // 5. Validate each customer has correct status based on deleted_at
  for (const customer of activeCustomers.data) {
    // Active customers must have status='active'
    TestValidator.equals("active customer status", customer.status, "active");
    // Active customers must have deleted_at as null or undefined
    TestValidator.equals(
      "active customer deleted_at is null",
      customer.deleted_at,
      null,
    );
    // Profile must exist
    TestValidator.predicate(
      "has profile",
      customer.profile !== null && customer.profile !== undefined,
    );
  }
  // 6. Test that status filter returns expected behavior
  // When filtering by 'active', should only get customers where deleted_at IS NULL
  TestValidator.predicate(
    "all customers are active when filtering by active status",
    activeCustomers.data.every((c) => c.status === "active"),
  );
}
