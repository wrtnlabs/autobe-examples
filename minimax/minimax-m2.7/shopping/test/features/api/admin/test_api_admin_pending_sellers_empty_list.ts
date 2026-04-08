import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin retrieving pending sellers list when no pending sellers exist.
 *
 * Validates the admin dashboard functionality for viewing pending seller applications.
 * Since no sellers have been registered yet in this fresh environment, the endpoint
 * should return an empty list with proper pagination metadata.
 *
 * This test verifies:
 * - Admin authentication works correctly
 * - The pending sellers endpoint returns HTTP 200 success
 * - Response structure matches IPageIEcommerceMallSeller.ISummary schema
 * - Empty data array is returned when no pending sellers exist
 * - Pagination metadata shows records=0 and pages=0
 *
 * 1. Create a new admin account with random credentials.
 * 2. Authenticate as admin using the utility function.
 * 3. Call GET /ecommerceMall/admin/admin/sellers/pending endpoint.
 * 4. Validate response structure with typia.assert().
 * 5. Assert data array is empty (no pending sellers).
 * 6. Assert pagination records equals 0.
 * 7. Assert pagination pages equals 0.
 */
export async function test_api_admin_pending_sellers_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Call the pending sellers endpoint
  const pendingSellers =
    await api.functional.ecommerceMall.admin.admin.sellers.pending(
      adminConnection,
    );
  // 3. Validate response structure
  typia.assert(pendingSellers);
  // 4. Validate data array is empty (no pending sellers exist)
  TestValidator.equals("data array is empty", pendingSellers.data.length, 0);
  TestValidator.equals("data is empty array", pendingSellers.data, []);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "records equals 0",
    pendingSellers.pagination.records,
    0,
  );
  TestValidator.equals("pages equals 0", pendingSellers.pagination.pages, 0);
  TestValidator.equals(
    "current page is 1",
    pendingSellers.pagination.current,
    1,
  );
}
