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
 * Test seller profile snapshots query returning empty result for a profile with no modification history.
 *
 * Authenticates as an administrator and queries the seller profile snapshots endpoint for a seller profile that exists but has never been modified, resulting in zero historical snapshots. The endpoint should handle this edge case gracefully by returning an empty paginated result with appropriate pagination metadata.
 *
 * Validates that the response structure conforms to the expected pagination type even when no snapshot records exist, ensuring the API correctly initializes pagination fields to zero values.
 *
 * 1. Authenticate as an administrator with random credentials.
 * 2. Generate a random seller profile UUID to target a profile with no edit history.
 * 3. Query the snapshots endpoint for the specified profile ID.
 * 4. Validate that the response contains an empty data array with zero total records and zero pages.
 */
export async function test_api_seller_profile_snapshots_no_history_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_admin_join(adminConnection, {
    body: {} satisfies DeepPartial<IEcommercePlatformAdmin.IJoin>,
  });
  typia.assert(authResult);
  // 2. Generate random seller profile UUID for edge case testing
  const profileId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Query snapshots endpoint - profile exists but has no modification history
  const snapshotsPage =
    await api.functional.ecommercePlatform.admin.seller_profiles.snapshots.index(
      adminConnection,
      {
        profileId,
        body: {} satisfies IEcommercePlatformSnapshotSellerProfile.IRequest,
      },
    );
  // 4. Validate empty paginated result
  typia.assert(snapshotsPage);
  TestValidator.equals(
    "empty data array for profile with no snapshots",
    snapshotsPage.data.length,
    0,
  );
  TestValidator.equals(
    "zero total records in pagination",
    snapshotsPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero total pages for empty result",
    snapshotsPage.pagination.pages,
    0,
  );
}
