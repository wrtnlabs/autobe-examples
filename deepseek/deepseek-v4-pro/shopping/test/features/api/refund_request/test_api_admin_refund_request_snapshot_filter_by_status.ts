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
 * Test filtering refund request snapshots by status as an administrator.
 *
 * Validates that the admin snapshot listing endpoint correctly filters results when the status parameter is set to "approved". The test authenticates as a platform administrator and queries the snapshot listing endpoint with a status filter, then verifies that every returned snapshot has the "approved" status and that pagination metadata accurately reflects the filtered subset.
 *
 * The endpoint supports filtering by snapshot status (approved or rejected), date range, and standard pagination. This test focuses specifically on the status filter, ensuring that only approved snapshots appear in the filtered result set.
 *
 * 1. Administrator registers and authenticates via the join endpoint.
 * 2. Administrator queries refund request snapshots with status filter set to "approved".
 * 3. Validates that all returned snapshots have status "approved".
 * 4. Validates pagination metadata reflects the filtered subset count.
 */
export async function test_api_admin_refund_request_snapshot_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Query refund request snapshots with status filter
  const result =
    await api.functional.shoppingMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        requestId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          status: "approved",
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate that all returned snapshots have "approved" status
  TestValidator.predicate(
    "all snapshots have approved status",
    result.data.every((snapshot) => snapshot.status === "approved"),
  );
  // 4. Validate pagination metadata reflects the filtered subset
  TestValidator.predicate(
    "pagination records count matches filtered data length",
    result.pagination.records === result.data.length,
  );
}
