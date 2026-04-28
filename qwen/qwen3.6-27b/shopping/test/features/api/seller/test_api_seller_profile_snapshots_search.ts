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

export async function test_api_seller_profile_snapshots_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized: IEcommercePlatformSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  // 2. Search profile snapshots with a search term (case-insensitive matching)
  const searchBody = {
    search: "shop",
    page: 1,
    limit: 20,
  } satisfies IEcommercePlatformSnapshotSellerProfile.IRequest;
  const snapshots =
    await api.functional.ecommercePlatform.seller.profile_snapshots.index(
      sellerConnection,
      {
        body: searchBody,
      },
    );
  typia.assert(snapshots);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has valid structure",
    snapshots.pagination.current >= 1 &&
      snapshots.pagination.limit >= 0 &&
      snapshots.pagination.records >= 0 &&
      snapshots.pagination.pages >= 0,
  );
  // 4. Validate snapshot data structure if results exist
  if (snapshots.data.length > 0) {
    const firstSnapshot = snapshots.data[0];
    typia.assert(firstSnapshot);
    // Validate required fields exist
    TestValidator.predicate(
      "snapshot has valid id",
      firstSnapshot.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot has valid created_at",
      firstSnapshot.created_at.length > 0,
    );
    TestValidator.predicate(
      "snapshot header has valid id",
      firstSnapshot.snapshot.id.length > 0,
    );
    TestValidator.predicate(
      "seller profile reference has valid id",
      firstSnapshot.sellerProfile.id.length > 0,
    );
  }
  // 5. Test with broader search to retrieve all available snapshots
  const allSnapshots =
    await api.functional.ecommercePlatform.seller.profile_snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformSnapshotSellerProfile.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // 6. Validate results are ordered by most recent first (created_at descending)
  if (allSnapshots.data.length > 1) {
    const firstDate = new Date(allSnapshots.data[0].created_at);
    const lastDate = new Date(
      allSnapshots.data[allSnapshots.data.length - 1].created_at,
    );
    TestValidator.predicate(
      "snapshots ordered by most recent modification first",
      firstDate.getTime() >= lastDate.getTime(),
    );
  }
  // 7. Validate pagination accuracy
  TestValidator.predicate(
    "data length does not exceed page limit",
    allSnapshots.data.length <= allSnapshots.pagination.limit,
  );
}
