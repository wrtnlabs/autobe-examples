import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator seller profile snapshot search with date range filters for dispute resolution.
 *
 * Validates that an authenticated administrator can query seller profile modification snapshots filtered by a specific date range. The system returns only snapshots where the modification timestamp falls between the provided start and end dates, enabling administrators to investigate profile changes during a specific period for audit and dispute resolution purposes.
 *
 * The test verifies that the response structure includes pagination metadata and that all returned snapshot records have creation timestamps within the specified date range boundary, ensuring the date filter is correctly applied by the backend.
 *
 * 1. Authenticate as a platform administrator via join endpoint.
 * 2. Generate a random seller profile UUID to query.
 * 3. Construct a date range filter (startDate 7 days ago to endDate as now).
 * 4. Query seller profile snapshots with the date range filter via PATCH endpoint.
 * 5. Validate response type structure using typia.assert.
 * 6. Verify pagination metadata is present and data array exists.
 * 7. Assert all returned snapshots have created_at within the date range.
 */
export async function test_api_seller_profile_snapshots_dispute_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as platform administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate random seller profile UUID
  const profileId = typia.random<string & tags.Format<"uuid">>();
  // 3. Construct date range filter (7 days ago to now)
  const now = new Date();
  const endDate = now.toISOString();
  const startDate = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // 4. Query snapshots with date range filter
  const body = {
    startDate,
    endDate,
  } satisfies IEcommercePlatformSnapshotSellerProfile.IRequest;
  const snapshots =
    await api.functional.ecommercePlatform.admin.seller_profiles.snapshots.index(
      adminConnection,
      {
        profileId,
        body,
      },
    );
  typia.assert(snapshots);
  // 5. Validate response structure
  TestValidator.predicate(
    "Pagination metadata present",
    snapshots.pagination !== undefined,
  );
  TestValidator.predicate("Data array exists", Array.isArray(snapshots.data));
  // 6. Verify all returned snapshots fall within the specified date range
  snapshots.data.forEach((snapshot) => {
    const createdDate = new Date(snapshot.created_at).toISOString();
    TestValidator.predicate(
      `Snapshot ${snapshot.id} has created_at >= startDate`,
      createdDate >= startDate,
    );
    TestValidator.predicate(
      `Snapshot ${snapshot.id} has created_at <= endDate`,
      createdDate <= endDate,
    );
  });
}
