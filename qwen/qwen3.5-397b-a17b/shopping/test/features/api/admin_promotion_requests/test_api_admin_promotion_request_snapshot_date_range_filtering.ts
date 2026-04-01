import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequestSnapshot";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_seller_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test admin promotion request snapshot date range filtering.
 *
 * This test verifies that sellers can filter snapshots by creation date range
 * to retrieve audit trail entries within specific time periods.
 *
 * Test Steps:
 * 1. Register a new seller account
 * 2. Submit an administrator promotion request
 * 3. Record the request creation timestamp
 * 4. Retrieve snapshots with createdAt_from filter
 * 5. Retrieve snapshots with createdAt_to filter (before creation)
 * 6. Retrieve snapshots with both filters forming a valid range
 * 7. Verify all returned snapshots fall within the specified date range
 */
export async function test_api_admin_promotion_request_snapshot_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Submit administrator promotion request
  const promotionRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(promotionRequest);
  // 3. Record the request creation timestamp
  const requestCreatedAt = promotionRequest.created_at;
  const requestCreatedAtDate = new Date(requestCreatedAt);
  // Create timestamps for filtering
  const beforeRequest = new Date(
    requestCreatedAtDate.getTime() - 1000,
  ).toISOString();
  const afterRequest = new Date(
    requestCreatedAtDate.getTime() + 1000,
  ).toISOString();
  // 4. Retrieve snapshots with createdAt_from filter set to the request creation time
  const snapshotsFromRequest =
    await api.functional.shoppingMall.seller.admin_promotion_requests.snapshots.index(
      sellerConnection,
      {
        requestId: promotionRequest.id,
        body: {
          created_at_from: requestCreatedAt,
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsFromRequest);
  // 5. Verify response contains snapshots created on or after the specified timestamp
  TestValidator.predicate(
    "snapshots from request time should have data",
    () => snapshotsFromRequest.data.length > 0,
  );
  for (const snapshot of snapshotsFromRequest.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} createdAt should be >= requestCreatedAt`,
      () =>
        new Date(snapshot.createdAt).getTime() >=
        requestCreatedAtDate.getTime(),
    );
  }
  // 6. Retrieve snapshots with createdAt_to filter set to a time before the request was created
  const snapshotsBeforeRequest =
    await api.functional.shoppingMall.seller.admin_promotion_requests.snapshots.index(
      sellerConnection,
      {
        requestId: promotionRequest.id,
        body: {
          created_at_to: beforeRequest,
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsBeforeRequest);
  // 7. Verify response contains empty data array (no snapshots before creation)
  TestValidator.equals(
    "snapshots before request should be empty",
    snapshotsBeforeRequest.data.length,
    0,
  );
  // 8. Retrieve snapshots with both createdAt_from and createdAt_to forming a valid range
  const snapshotsInRange =
    await api.functional.shoppingMall.seller.admin_promotion_requests.snapshots.index(
      sellerConnection,
      {
        requestId: promotionRequest.id,
        body: {
          created_at_from: requestCreatedAt,
          created_at_to: afterRequest,
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsInRange);
  // 9. Verify all returned snapshots fall within the specified date range
  TestValidator.predicate(
    "snapshots in range should have data",
    () => snapshotsInRange.data.length > 0,
  );
  const rangeFromDate = new Date(requestCreatedAt);
  const rangeToDate = new Date(afterRequest);
  for (const snapshot of snapshotsInRange.data) {
    const snapshotDate = new Date(snapshot.createdAt);
    TestValidator.predicate(
      `snapshot ${snapshot.id} should be >= range from`,
      () => snapshotDate.getTime() >= rangeFromDate.getTime(),
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} should be <= range to`,
      () => snapshotDate.getTime() <= rangeToDate.getTime(),
    );
  }
}
