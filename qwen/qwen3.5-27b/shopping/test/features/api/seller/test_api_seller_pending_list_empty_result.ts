import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test the edge case where no sellers are in pending approval status.
 *
 * Validates that when an authenticated administrator requests the pending sellers list and there are no sellers with approval_status='pending', the system returns an empty data array with pagination metadata showing records=0 and pages=0. This ensures the endpoint handles empty result sets gracefully without errors and maintains consistent response structure.
 *
 * The test verifies that the pagination metadata correctly reflects an empty dataset, with records and pages both set to zero, while maintaining valid current page and limit values. This edge case validation ensures the API response structure remains consistent regardless of data availability.
 *
 * 1. Authenticate as administrator to access the pending sellers list endpoint.
 * 2. Request the pending sellers list with no filters (assuming no pending sellers exist).
 * 3. Validate the response contains an empty data array.
 * 4. Validate pagination metadata shows records=0 and pages=0.
 * 5. Confirm response structure matches expected pagination format.
 */
export async function test_api_seller_pending_list_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Request pending sellers list (expecting empty result)
  const output =
    await api.functional.shoppingMall.administrator.sellers.pending.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(output);
  // 3. Validate empty data array
  TestValidator.equals("data array is empty", output.data.length, 0);
  // 4. Validate pagination metadata
  TestValidator.equals("records count is 0", output.pagination.records, 0);
  TestValidator.equals("pages count is 0", output.pagination.pages, 0);
  TestValidator.predicate(
    "current page is valid",
    output.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", output.pagination.limit > 0);
}
