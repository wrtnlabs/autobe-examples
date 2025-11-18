import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPerformanceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPerformanceSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPerformanceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceSnapshot";

/**
 * Validate that an authenticated admin can retrieve full details of an existing
 * seller performance snapshot.
 *
 * Business flow:
 *
 * 1. Register (join) a new admin account and obtain an authenticated context.
 * 2. Call the snapshot index endpoint to discover at least one existing seller
 *    performance snapshot (assumed to be seeded by background jobs).
 * 3. Pick one snapshot ID from the index result.
 * 4. Call the snapshot detail endpoint with that ID.
 * 5. Assert that the response matches IShoppingMallSellerPerformanceSnapshot and
 *    that key business-level invariants hold (ID match, seller summary
 *    consistency, KPI ranges, non-negative counts, non-empty timezone).
 */
export async function test_api_admin_seller_performance_snapshot_detail_happy_path(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authenticated admin context
  const admin = await api.functional.auth.admin.join(connection, {
    body: typia.random<IShoppingMallAdminJoin.ICreate>(),
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Discover at least one seller performance snapshot via index
  const page =
    await api.functional.shoppingMall.admin.sellerPerformanceSnapshots.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert<IPageIShoppingMallSellerPerformanceSnapshot.ISummary>(page);

  // Basic sanity check on pagination and existence of data
  TestValidator.predicate(
    "at least one seller performance snapshot exists",
    page.data.length > 0,
  );

  const summary = page.data[0];
  typia.assert<IShoppingMallSellerPerformanceSnapshot.ISummary>(summary);

  // 3. Retrieve detail for the chosen snapshot
  const detail =
    await api.functional.shoppingMall.admin.sellerPerformanceSnapshots.at(
      connection,
      {
        snapshotId: summary.id,
      },
    );
  typia.assert<IShoppingMallSellerPerformanceSnapshot>(detail);

  // 4. DTO and business rule validations

  // 4-1. ID consistency
  TestValidator.equals(
    "detail snapshot id matches summary id",
    detail.id,
    summary.id,
  );

  // 4-2. Seller summary consistency
  TestValidator.equals(
    "seller id matches between summary and detail",
    detail.seller.id,
    summary.seller.id,
  );
  TestValidator.equals(
    "seller email matches between summary and detail",
    detail.seller.email,
    summary.seller.email,
  );
  TestValidator.equals(
    "seller status matches between summary and detail",
    detail.seller.status,
    summary.seller.status,
  );
  TestValidator.equals(
    "seller emailVerified matches between summary and detail",
    detail.seller.emailVerified,
    summary.seller.emailVerified,
  );
  TestValidator.equals(
    "seller createdAt matches between summary and detail",
    detail.seller.createdAt,
    summary.seller.createdAt,
  );

  // 4-3. KPI numeric ranges [0,1]
  TestValidator.predicate(
    "order_defect_rate is between 0 and 1",
    detail.order_defect_rate >= 0 && detail.order_defect_rate <= 1,
  );
  TestValidator.predicate(
    "refund_rate is between 0 and 1",
    detail.refund_rate >= 0 && detail.refund_rate <= 1,
  );
  TestValidator.predicate(
    "cancellation_rate is between 0 and 1",
    detail.cancellation_rate >= 0 && detail.cancellation_rate <= 1,
  );
  TestValidator.predicate(
    "late_shipment_rate is between 0 and 1",
    detail.late_shipment_rate >= 0 && detail.late_shipment_rate <= 1,
  );
  TestValidator.predicate(
    "chargeback_rate is between 0 and 1",
    detail.chargeback_rate >= 0 && detail.chargeback_rate <= 1,
  );

  // 4-4. Rating and dispute metrics
  TestValidator.predicate(
    "rating_count is non-negative",
    detail.rating_count >= 0,
  );
  TestValidator.predicate(
    "average_rating is a finite number",
    Number.isFinite(detail.average_rating),
  );
  TestValidator.predicate(
    "dispute_open_count is non-negative",
    detail.dispute_open_count >= 0,
  );

  // 4-5. Snapshot timestamps and timezone
  TestValidator.predicate(
    "snapshot_date is a non-empty string",
    detail.snapshot_date.length > 0,
  );
  TestValidator.predicate(
    "created_at is a non-empty string",
    detail.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is a non-empty string",
    detail.updated_at.length > 0,
  );
  TestValidator.predicate(
    "timezone is a non-empty string",
    detail.timezone.length > 0,
  );
}
