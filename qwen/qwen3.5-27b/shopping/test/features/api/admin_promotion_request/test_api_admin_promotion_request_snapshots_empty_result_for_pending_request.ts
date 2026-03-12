import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdminPromotionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_admin_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test that the snapshots endpoint returns an empty array when a promotion request exists but has no snapshots yet (request is still pending).
 *
 * Setup: Create an admin account and submit a promotion request without having it approved or rejected yet.
 *
 * Test steps:
 * 1. Authenticate as administrator using authorize_admin_join utility
 * 2. Submit a new promotion request using generate_random_shopping_mall_admin_admin_promotion_requests_create utility
 * 3. Call the snapshots endpoint with the pending request ID
 * 4. Verify the response contains an empty data array
 * 5. Verify pagination metadata shows records: 0, pages: 0
 * 6. Verify no error is returned - empty results are valid
 *
 * Expected: When a promotion request is in 'pending' status and no snapshots have been created yet, the endpoint should return an empty paginated result without errors. This is a valid state before super admin responds to the request.
 */
export async function test_api_admin_promotion_request_snapshots_empty_result_for_pending_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Submit a new promotion request (status will be 'pending')
  const promotionRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      adminConnection,
      {},
    );
  typia.assert(promotionRequest);
  // Verify the request is in pending status
  TestValidator.equals(
    "promotion request status is pending",
    promotionRequest.status,
    "pending",
  );
  // 3. Call the snapshots endpoint with the pending request ID
  const snapshotsResponse =
    await api.functional.shoppingMall.admin.admin_promotion_requests.snapshots.index(
      adminConnection,
      {
        requestId: promotionRequest.id,
        body: {} satisfies IShoppingMallAdminPromotionSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 4. Verify the response contains an empty data array
  TestValidator.equals(
    "snapshots data array is empty",
    snapshotsResponse.data.length,
    0,
  );
  // 5. Verify pagination metadata shows records: 0, pages: 0
  TestValidator.equals(
    "pagination records count is 0",
    snapshotsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count is 0",
    snapshotsResponse.pagination.pages,
    0,
  );
  // 6. Verify no error is returned - empty results are valid
  TestValidator.predicate(
    "empty snapshots result is valid for pending request",
    snapshotsResponse.data.length === 0 &&
      snapshotsResponse.pagination.records === 0 &&
      snapshotsResponse.pagination.pages === 0,
  );
}
