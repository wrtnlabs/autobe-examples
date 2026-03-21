import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Update seller profile to generate a snapshot
  const shopName = RandomGenerator.name(2);
  const shopDescription = RandomGenerator.paragraph({ sentences: 2 });
  const updatedProfile =
    await api.functional.ecommerceMall.seller.seller.profile.update(
      sellerConnection,
      {
        body: {
          name: shopName,
          description: shopDescription,
          logoUri: null,
        } satisfies IEcommerceMallSellerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 3. List seller's profile snapshots to obtain a valid snapshotId
  const snapshotsPage =
    await api.functional.ecommerceMall.seller.seller_profile_snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  // Ensure at least one snapshot exists
  TestValidator.predicate("snapshots exist", snapshotsPage.data.length > 0);
  // Get the most recent snapshot
  const targetSnapshot = snapshotsPage.data[0];
  const snapshotId = targetSnapshot.id;
  // 4. Retrieve the specific snapshot using the target endpoint
  const retrievedSnapshot =
    await api.functional.ecommerceMall.seller.seller_profile_snapshots.at(
      sellerConnection,
      {
        snapshotId: snapshotId,
      },
    );
  typia.assert(retrievedSnapshot);
  // 5. Validate the response contains expected snapshot data
  TestValidator.equals("snapshot id matches", retrievedSnapshot.id, snapshotId);
  TestValidator.equals(
    "shop name captured",
    retrievedSnapshot.shop_name,
    targetSnapshot.shop_name,
  );
  TestValidator.equals(
    "shop description captured",
    retrievedSnapshot.shop_description,
    targetSnapshot.shop_description,
  );
  TestValidator.equals(
    "logo url captured",
    retrievedSnapshot.logo_url,
    targetSnapshot.logo_url,
  );
  TestValidator.predicate(
    "has valid created_at timestamp",
    retrievedSnapshot.created_at.length > 0,
  );
  TestValidator.predicate(
    "has sellerProfile reference",
    retrievedSnapshot.sellerProfile !== undefined,
  );
}
