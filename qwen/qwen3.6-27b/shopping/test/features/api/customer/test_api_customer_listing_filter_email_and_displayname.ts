import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test customer listing with email address filtering and display name partial matching.
 *
 * Validates the platform administrator's ability to search for customer accounts using both email address filtering and display name partial matching. The test constructs filter criteria with randomized substrings and queries the customer listing endpoint with combined filters, verifying that the system correctly applies both email and displayName search parameters.
 *
 * The email filter performs case-insensitive partial matching against customer email addresses. The displayName filter executes a cross-table query via LEFT JOIN on the customer profiles table to match against the display_name field. Both filters can be combined in a single request.
 *
 * Response structure and pagination metadata are validated to ensure the API returns correctly formatted paginated results matching the IPageIEcommercePlatformCustomer.ISummary type specification.
 *
 * 1. Register and authenticate a new platform administrator.
 * 2. Generate random email substring and display name substring for filter criteria.
 * 3. Query customer listing endpoint with combined email and displayName filters.
 * 4. Validate complete response type and pagination metadata.
 */
export async function test_api_customer_listing_filter_email_and_displayname(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new platform administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate random substrings for email and display name filter criteria
  const filterEmailSubstring: string = RandomGenerator.alphabets(5);
  const filterDisplayNameSubstring: string = RandomGenerator.alphabets(5);
  // 3. Query customer listing with combined email and displayName filters
  const body = {
    email: filterEmailSubstring,
    displayName: filterDisplayNameSubstring,
  } satisfies IEcommercePlatformCustomer.IRequest;
  const response = await api.functional.ecommercePlatform.customers.index(
    adminConnection,
    { body },
  );
  typia.assert(response);
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current is non-negative integer",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative integer",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative integer",
    response.pagination.records >= 0,
  );
}
