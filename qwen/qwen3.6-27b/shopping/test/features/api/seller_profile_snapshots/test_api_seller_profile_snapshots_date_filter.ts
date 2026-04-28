import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import type { IEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test date range filtering for seller profile modification snapshots.
 *
 * Validates the temporal filtering capability of the profile snapshots endpoint by verifying that startDate and endDate query parameters correctly filter snapshot records. When both ISO 8601 datetime timestamps are provided, only snapshots with created_at within that range (created_at >= startDate AND created_at <= endDate) are returned. Results are ordered by most recent modification first.
 *
 * The test ensures pagination metadata accurately reflects the filtered record count and that the date range filtering excludes snapshots outside the specified timestamps.
 *
 * 1. Authenticate a seller account via registration.
 * 2. Construct a date range with startDate and endDate as ISO 8601 timestamps.
 * 3. Query profile snapshots with the date range filter.
 * 4. Validate response structure and that all snapshots fall within the date range.
 * 5. Verify results are ordered by created_at descending.
 */
export async function test_api_seller_profile_snapshots_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Generate date range - cover approximately 60 days of historical data
  const now = new Date();
  const endDateDate = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  );
  const endDate = endDateDate.toISOString(); // 1 week ago
  const startDate = new Date(
    endDateDate.getTime() - 60 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 60 days before endDate
  // 3. Query with date range filter
  const body = {
    startDate,
    endDate,
  } satisfies IEcommercePlatformSnapshotSellerProfile.IRequest;
  const response =
    await api.functional.ecommercePlatform.seller.profile_snapshots.index(
      sellerConnection,
      { body },
    );
  typia.assert(response);
  // 4. Validate all snapshots fall within the date range
  for (const snapshot of response.data) {
    const snapshotDate = snapshot.created_at;
    TestValidator.predicate(
      `snapshot ${snapshot.id} created_at is >= startDate`,
      snapshotDate >= startDate,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} created_at is <= endDate`,
      snapshotDate <= endDate,
    );
  }
  // 5. Verify ordering - created_at should be descending (most recent first)
  for (let i = 1; i < response.data.length; i++) {
    TestValidator.predicate(
      `results ordered by created_at DESC at index ${i}`,
      response.data[i - 1].created_at >= response.data[i].created_at,
    );
  }
  // 6. Verify pagination metadata
  TestValidator.equals(
    "pagination records matches data array length",
    response.pagination.records,
    response.data.length,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
}