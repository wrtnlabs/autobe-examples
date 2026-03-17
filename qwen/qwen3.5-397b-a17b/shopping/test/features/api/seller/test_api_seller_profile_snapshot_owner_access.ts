import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProfileSnapshot";
import type { ISellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ISellerProfileSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProfileSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller can successfully retrieve their own profile snapshot.
 *
 * This test validates the owner access pattern for seller profile snapshots:
 * 1. Register a new seller account and authenticate
 * 2. List the seller's profile snapshots to obtain snapshot IDs
 * 3. Retrieve a specific snapshot using its ID
 * 4. Verify the snapshot data is correct and belongs to the authenticated seller
 *
 * This ensures sellers can access their immutable profile history for audit purposes.
 */
export async function test_api_seller_profile_snapshot_owner_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. List the seller's profile snapshots to obtain snapshot IDs
  const snapshotsPage =
    await api.functional.shoppingMall.seller.profile.snapshots.list(
      sellerConnection,
    );
  typia.assert(snapshotsPage);
  // 3. Verify snapshots exist and get the first snapshot ID
  TestValidator.predicate(
    "at least one snapshot exists after registration",
    () => snapshotsPage.data.length > 0,
  );
  const snapshotId = snapshotsPage.data[0]!.id;
  // 4. Retrieve the specific snapshot by ID
  const snapshot =
    await api.functional.shoppingMall.seller.profile.snapshots.at(
      sellerConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 5. Verify snapshot belongs to the authenticated seller
  TestValidator.equals(
    "snapshot seller ID matches authenticated seller",
    snapshot.seller.id,
    seller.id,
  );
  // 6. Verify snapshot contains correct shop information
  TestValidator.equals(
    "snapshot shop name matches seller shop name",
    snapshot.shopName,
    seller.shop_name,
  );
  TestValidator.equals(
    "snapshot shop description matches seller shop description",
    snapshot.shopDescription,
    seller.shop_description ?? null,
  );
  TestValidator.equals(
    "snapshot logo URL matches seller logo URL",
    snapshot.logoImageUrl,
    seller.logo_image_url ?? null,
  );
  // 7. Verify snapshot has valid timestamp
  TestValidator.predicate(
    "snapshot has valid created timestamp",
    () => new Date(snapshot.createdAt).getTime() > 0,
  );
  // 8. Verify seller info in snapshot matches authenticated seller
  TestValidator.equals(
    "snapshot seller email matches",
    snapshot.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "snapshot seller shop name matches",
    snapshot.seller.shop_name,
    seller.shop_name,
  );
  TestValidator.equals(
    "snapshot seller approval status",
    snapshot.seller.approval_status,
    seller.approval_status,
  );
}
