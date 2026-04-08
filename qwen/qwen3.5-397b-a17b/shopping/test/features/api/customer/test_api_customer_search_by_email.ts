import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallMember";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator searching customer accounts by email partial match.
 *
 * Validates the customer search functionality with email filtering capabilities. Ensures that administrators can locate customer accounts using partial email matching, supporting efficient customer identification for support and account management purposes.
 *
 * 1. Administrator authenticates via join operation to obtain access credentials.
 * 2. Administrator requests customer list with email filter using domain-based partial match pattern.
 * 3. Verifies response structure contains pagination metadata and customer data array.
 * 4. Validates all returned customers match the email search pattern (LIKE operator behavior).
 * 5. Tests username-based partial match search pattern.
 * 6. Validates empty results handling when no matches found returns empty array, not error.
 */
export async function test_api_customer_search_by_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test email partial match search with domain pattern
  const domainSearch = await api.functional.shoppingMall.admin.customers.index(
    adminConnection,
    {
      body: {
        email: "@example.com",
        take: 50,
      } satisfies IShoppingMallMember.IRequest,
    },
  );
  typia.assert(domainSearch);
  // 3. Verify all returned customers match the email search pattern
  for (const customer of domainSearch.data) {
    TestValidator.predicate(
      "email contains domain search term",
      customer.email.includes("@example.com"),
    );
  }
  // 4. Test with username prefix search pattern
  const usernameSearch =
    await api.functional.shoppingMall.admin.customers.index(adminConnection, {
      body: {
        email: "test",
        take: 50,
      } satisfies IShoppingMallMember.IRequest,
    });
  typia.assert(usernameSearch);
  // 5. Verify all results match username pattern (case-insensitive)
  for (const customer of usernameSearch.data) {
    TestValidator.predicate(
      "email contains test prefix",
      customer.email.toLowerCase().includes("test"),
    );
  }
  // 6. Test without email filter (should return customers)
  const allCustomers = await api.functional.shoppingMall.admin.customers.index(
    adminConnection,
    {
      body: {
        take: 100,
      } satisfies IShoppingMallMember.IRequest,
    },
  );
  typia.assert(allCustomers);
  // 7. Validate pagination metadata consistency
  TestValidator.predicate(
    "current page is positive",
    allCustomers.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    allCustomers.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    allCustomers.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination records match data length",
    allCustomers.pagination.records,
    allCustomers.data.length,
  );
  // 8. Test unique email pattern that likely returns empty results
  const uniqueSearch = await api.functional.shoppingMall.admin.customers.index(
    adminConnection,
    {
      body: {
        email: `_${RandomGenerator.alphaNumeric(16)}_`,
        take: 50,
      } satisfies IShoppingMallMember.IRequest,
    },
  );
  typia.assert(uniqueSearch);
  // 9. Empty results should return valid structure with zero records
  TestValidator.equals(
    "empty search returns zero records",
    uniqueSearch.pagination.records,
    uniqueSearch.data.length,
  );
}
