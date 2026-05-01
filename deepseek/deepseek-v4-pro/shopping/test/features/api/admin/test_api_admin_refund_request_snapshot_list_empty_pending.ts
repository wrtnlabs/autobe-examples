import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test listing refund request snapshots when the refund request is still pending.
 *
 * Validates that when an administrator lists snapshots for a refund request that has not yet been acted upon by any seller, the API returns a successful response with an empty result set. This confirms that the absence of seller responses is correctly represented as zero snapshots rather than an error.
 *
 * An empty snapshot list for a pending refund request is the expected and valid state — the refund request exists but no seller has approved or rejected it, so no snapshot records have been created. The pagination metadata must reflect this by showing records: 0 and pages: 0.
 *
 * 1. Administrator authenticates via join endpoint.
 * 2. Administrator queries snapshots for a pending refund request using a random request ID.
 * 3. Validates response type with typia.assert().
 * 4. Verifies pagination records is 0.
 * 5. Verifies pagination pages is 0.
 * 6. Verifies data array is empty.
 */
export async function test_api_admin_refund_request_snapshot_list_empty_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Query snapshots for a pending refund request
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const result =
    await api.functional.shoppingMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        requestId,
        body: {} satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate empty result set
  TestValidator.equals("pagination records", result.pagination.records, 0);
  TestValidator.equals("pagination pages", result.pagination.pages, 0);
  TestValidator.equals("data length", result.data.length, 0);
}
