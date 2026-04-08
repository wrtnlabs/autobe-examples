import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
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
 * Test the edge case where no refund request snapshots exist in the system.
 *
 * Validates that the refund request snapshots endpoint correctly handles an empty dataset, returning proper pagination metadata and an empty data array without errors. This test ensures the system gracefully queries empty audit snapshot tables.
 *
 * Special attention is given to verifying that pagination metadata correctly reflects zero records and that the response structure remains valid even when no snapshots exist.
 *
 * 1. Administrator registers and authenticates to the system.
 * 2. Administrator queries refund request snapshots with no filters.
 * 3. Validates response returns empty data array.
 * 4. Validates pagination metadata shows current=1, limit=20, records=0, pages=0.
 */
export async function test_api_refund_request_snapshots_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // 2. Query refund request snapshots with no filters
  const snapshots =
    await api.functional.shoppingMall.administrator.refund_requests.snapshots.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 3. Validate empty data array
  TestValidator.equals("data array is empty", snapshots.data.length, 0);
  // 4. Validate pagination metadata for empty dataset
  TestValidator.equals("current page is 1", snapshots.pagination.current, 1);
  TestValidator.equals("limit is default 20", snapshots.pagination.limit, 20);
  TestValidator.equals("records count is 0", snapshots.pagination.records, 0);
  TestValidator.equals("pages count is 0", snapshots.pagination.pages, 0);
}
