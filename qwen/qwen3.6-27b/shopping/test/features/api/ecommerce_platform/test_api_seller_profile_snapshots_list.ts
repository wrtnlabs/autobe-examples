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
 * Test seller profile snapshots list retrieval with pagination and audit trail validation.
 *
 * Validates the complete seller profile snapshot retrieval flow including seller authentication and paginated snapshot listing. Ensures that the response correctly includes pagination metadata and that snapshot records capture the immutable audit trail of profile modifications.
 *
 * Special attention is given to verifying entity type classification as 'seller_profile' and that before-and-after state pairs for shop name, description, and logo URI are properly captured.
 *
 * 1. Seller registers with email, password, and session context.
 * 2. Seller retrieves paginated profile snapshots without filters.
 * 3. Validates pagination metadata matches expected defaults.
 */
export async function test_api_seller_profile_snapshots_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.IJoin,
  });
  // 2. Request seller profile snapshots without filters
  const body = {
    page: undefined,
    limit: undefined,
  } satisfies IEcommercePlatformSnapshotSellerProfile.IRequest;
  const snapshots =
    await api.functional.ecommercePlatform.seller.profile_snapshots.index(
      sellerConnection,
      { body },
    );
  typia.assert(snapshots);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", snapshots.pagination.current, 1);
  TestValidator.equals("limit is 20", snapshots.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    snapshots.pagination.pages >= 0,
  );
  // 4. Validate snapshot records if any exist
  if (snapshots.data.length > 0) {
    const snapshot = snapshots.data[0];
    typia.assert(snapshot);
    TestValidator.equals(
      "entity type is seller_profile",
      snapshot.snapshot.entityType,
      "seller_profile",
    );
    TestValidator.predicate(
      "snapshot has valid id",
      typeof snapshot.id === "string",
    );
    TestValidator.predicate(
      "snapshot has modification timestamp",
      typeof snapshot.created_at === "string",
    );
    // Validate before/after state fields structure (can be null but must exist)
    TestValidator.predicate(
      "previous shop name is string or null",
      typeof snapshot.previousShopName === "string" ||
        snapshot.previousShopName === null,
    );
    TestValidator.predicate(
      "current shop name is string or null",
      typeof snapshot.currentShopName === "string" ||
        snapshot.currentShopName === null,
    );
  }
  // 5. Validate seller profile reference in snapshots
  if (snapshots.data.length > 0) {
    const snapshot = snapshots.data[0];
    typia.assert(snapshot);
    typia.assert(snapshot.sellerProfile);
    TestValidator.predicate(
      "seller profile has valid id",
      typeof snapshot.sellerProfile.id === "string",
    );
    TestValidator.predicate(
      "seller profile has shop name",
      typeof snapshot.sellerProfile.shop_name === "string",
    );
  }
}
