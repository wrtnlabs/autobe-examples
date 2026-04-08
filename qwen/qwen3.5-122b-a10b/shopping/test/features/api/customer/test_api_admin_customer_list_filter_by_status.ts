import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering customer accounts by status (active vs deleted).
 *
 * Validates the customer listing endpoint's status filtering capability for administrators. Tests that the system correctly distinguishes between active and soft-deleted customer accounts based on the deleted_at timestamp, and that filtering works as expected for each status type.
 *
 * 1. Administrator authenticates with join endpoint.
 * 2. Tests filtering by 'active' status - should return only non-deleted customers (deleted_at IS NULL).
 * 3. Tests filtering by 'deleted' status - should return only soft-deleted customers (deleted_at IS NOT NULL).
 * 4. Tests default behavior (no status filter) - should return only active customers.
 * 5. Validates that deleted_at timestamp correctly determines account status in responses.
 */
export async function test_api_admin_customer_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test filtering by 'active' status
  const activeFilterResult = await api.functional.ecommerce.customers.index(
    adminConnection,
    {
      body: {
        status: "active",
        limit: 100,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(activeFilterResult);
  // All returned customers should have deleted_at = null
  for (const customer of activeFilterResult.data) {
    TestValidator.predicate(
      "active customer has null deleted_at",
      customer.deleted_at === null,
    );
  }
  // 3. Test filtering by 'deleted' status
  const deletedFilterResult = await api.functional.ecommerce.customers.index(
    adminConnection,
    {
      body: {
        status: "deleted",
        limit: 100,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(deletedFilterResult);
  // All returned customers should have deleted_at != null
  for (const customer of deletedFilterResult.data) {
    TestValidator.predicate(
      "deleted customer has non-null deleted_at",
      customer.deleted_at !== null,
    );
  }
  // 4. Test default behavior (no status filter) - should return only active customers
  const defaultResult = await api.functional.ecommerce.customers.index(
    adminConnection,
    {
      body: {
        limit: 100,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(defaultResult);
  // All returned customers should have deleted_at = null (same as active filter)
  for (const customer of defaultResult.data) {
    TestValidator.predicate(
      "default filter returns only active customers",
      customer.deleted_at === null,
    );
  }
  // 5. Verify that active filter and default filter return the same count
  TestValidator.equals(
    "active filter and default filter return same count",
    activeFilterResult.pagination.records,
    defaultResult.pagination.records,
  );
  // 6. Verify pagination structure is correct
  TestValidator.predicate(
    "pagination has valid current page",
    defaultResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    defaultResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    defaultResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    defaultResult.pagination.pages >= 0,
  );
}
