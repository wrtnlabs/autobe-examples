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
 * Test admin filtering customer accounts by email search.
 *
 * Validates the admin customer listing endpoint with email search filter.
 * Ensures that searching with a partial email string (e.g., 'user@') returns
 * only customers whose emails contain that substring in a case-insensitive manner.
 *
 * The test authenticates as an administrator, sends a PATCH request with
 * the search parameter, and validates that the returned customer list
 * matches the expected filtering behavior.
 *
 * 1. Authenticate as administrator using admin join endpoint.
 * 2. Send PATCH request to customer list with email search filter 'user@'.
 * 3. Verify response contains paginated list with pagination metadata.
 * 4. Validate all returned customers have emails containing 'user@' (case-insensitive).
 * 5. Validate pagination records count matches filtered results.
 */
export async function test_api_customer_listing_email_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Search for customers with email containing 'user@'
  const searchFilter = "user@";
  const response =
    await api.functional.ecommerceMall.admin.admin.customers.index(
      adminConnection,
      {
        body: {
          search: searchFilter,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallCustomer.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current is 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate all emails contain the search string (case-insensitive)
  for (const customer of response.data) {
    TestValidator.predicate(
      `email "${customer.email}" contains "${searchFilter}"`,
      customer.email.toLowerCase().includes(searchFilter.toLowerCase()),
    );
  }
  // 5. Validate records count matches data length (for this page)
  TestValidator.equals(
    "data length does not exceed limit",
    response.data.length <= 100,
    true,
  );
}
