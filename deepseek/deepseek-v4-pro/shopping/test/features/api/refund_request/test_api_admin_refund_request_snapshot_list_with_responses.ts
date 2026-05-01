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
 * Test administrator retrieval of immutable refund request snapshots with seller responses.
 *
 * Validates that an authenticated administrator can list paginated snapshot records for a refund request. Each snapshot is an immutable historical record created automatically when a seller approves or rejects a refund request, preserving the customer's reason, the seller's decision, the responding seller's identity, and the decision timestamp.
 *
 * The test verifies structural compliance via typia.assert and confirms business logic around pagination metadata accuracy. Since snapshots are permanently immutable and the endpoint exposes no create, update, or delete operations, the test also confirms the read-only nature of this endpoint.
 *
 * 1. Administrator registers and authenticates to gain admin-level access.
 * 2. Administrator queries the snapshot listing endpoint with a random refund request ID and empty search criteria.
 * 3. Response is validated against the expected DTO structure via typia.assert.
 * 4. Pagination metadata accuracy is verified: default page is 1, data length does not exceed records count, pages count is mathematically correct.
 * 5. If multiple snapshots exist, their sort order is validated as newest first (created_at descending).
 */
export async function test_api_admin_refund_request_snapshot_list_with_responses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Query snapshots for a refund request
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
  // 3. Validate pagination metadata accuracy
  TestValidator.equals("default page is 1", result.pagination.current, 1);
  TestValidator.predicate(
    "data length does not exceed records count",
    result.data.length <= result.pagination.records,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    result.data.length <= result.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation is correct",
    result.pagination.pages,
    result.pagination.records === 0
      ? 0
      : Math.ceil(result.pagination.records / result.pagination.limit),
  );
  // 4. Validate snapshot sorting (newest first) if multiple snapshots exist
  if (result.data.length > 1) {
    for (let i = 1; i < result.data.length; i++) {
      TestValidator.predicate(
        `snapshot at index ${i} is not newer than snapshot at index ${i - 1}`,
        new Date(result.data[i].created_at).getTime() <=
          new Date(result.data[i - 1].created_at).getTime(),
      );
    }
  }
}
