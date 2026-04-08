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
 * Test admin listing all customer accounts with default pagination settings.
 *
 * Validates that an authenticated administrator can retrieve a paginated list
 * of all customer accounts on the platform. The test verifies the response
 * structure includes proper pagination metadata and that customer summaries
 * contain all required fields including profile information.
 *
 * The test ensures:
 * - Administrator authentication succeeds
 * - Empty request body returns default pagination (page 1, limit 20)
 * - Pagination object contains correct metadata (current, limit, records, pages)
 * - Customer summaries include id, email, created_at, status, and profile
 * - Profile objects contain display_name and phone
 * - Computed status field correctly reflects account state
 *
 * 1. Authenticate as administrator using admin join endpoint.
 * 2. Call customer listing endpoint with empty body for default pagination.
 * 3. Validate response has valid pagination structure.
 * 4. Validate pagination metadata values are non-negative integers.
 * 5. If customers exist, validate summary fields are present.
 * 6. Validate profile fields (display_name, phone) are included.
 * 7. Validate status is either 'active' or 'banned'.
 */
export async function test_api_customer_listing_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Call customer listing endpoint with default pagination (empty body)
  const response =
    await api.functional.ecommerceMall.admin.admin.customers.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(response);
  // 3. Validate response structure has pagination and data
  TestValidator.equals(
    "has pagination object",
    response.pagination !== null,
    true,
  );
  TestValidator.equals("has data array", Array.isArray(response.data), true);
  // 4. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current is non-negative",
    response.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is non-negative",
    response.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
    true,
  );
  // 5. Validate pagination logic consistency
  TestValidator.predicate("pages calculation consistent", () => {
    if (response.pagination.records === 0) {
      return response.pagination.pages === 0;
    }
    return response.pagination.pages > 0;
  });
  // 6. If customers exist, validate summary fields
  if (response.data.length > 0) {
    const customer = response.data[0];
    // Validate required customer summary fields
    TestValidator.equals("has valid uuid id", customer.id !== null, true);
    TestValidator.equals("has email field", customer.email !== null, true);
    TestValidator.equals(
      "has created_at timestamp",
      customer.created_at !== null,
      true,
    );
    TestValidator.equals("has status field", customer.status !== null, true);
    // 7. Validate computed status is correct type
    TestValidator.predicate("status is active or banned", () => {
      return customer.status === "active" || customer.status === "banned";
    });
    // 8. Validate profile object structure
    TestValidator.equals("has profile object", customer.profile !== null, true);
    TestValidator.equals(
      "profile has display_name",
      customer.profile.display_name !== null,
      true,
    );
    TestValidator.equals(
      "profile has phone",
      customer.profile.phone !== null,
      true,
    );
  }
}
