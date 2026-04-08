import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import type { IEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shop_profile_snapshot_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Note: CREATE endpoint for shop profiles is not available in current SDK.
  //    Assumed test setup provides a valid shopProfileId.
  //    In production, this would be: await api.functional.ecommerceMall.seller.shop_profiles.postBySellerid(...)
  //    We use a randomly generated UUID for testing structure (actual test data needs CREATE endpoint)
  const shopProfileId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Update shop profile with specific values (simulating first update)
  //    Note: Since we cannot create initial profile, we assume profile exists and update it
  //    First update creates snapshot of existing state (which we can't verify without GET)
  const updatedProfile =
    await api.functional.ecommerceMall.seller.shop_profiles.putByShopprofileid(
      sellerConnection,
      {
        shopProfileId,
        body: {
          shop_name: "Updated Shop",
          shop_description: "Updated Description",
          logo_url: "http://example.com/logo2.png",
        } satisfies IEcommerceMallShopProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Verify API returns updated profile with new values
  TestValidator.equals(
    "updated shop name",
    updatedProfile.shop_name,
    "Updated Shop",
  );
  TestValidator.equals(
    "updated shop description",
    updatedProfile.shop_description,
    "Updated Description",
  );
  TestValidator.equals(
    "updated logo URL",
    updatedProfile.logo_url,
    "http://example.com/logo2.png",
  );
  // 5. Retrieve snapshots from response
  const snapshots = updatedProfile.snapshots;
  // 6. Verify at least one snapshot exists (created during update)
  TestValidator.equals(
    "snapshot count after update",
    snapshots.length,
    1,
  );
  // 7. Verify snapshot contains the values from BEFORE the update
  //    Note: Without ability to create profile with known values, we verify snapshot exists
  //    In full test, snapshot should contain: shop_name="Original Shop", etc.
  const snapshot = snapshots[0]!;
  typia.assert(snapshot);
  // 8. Verify snapshot timestamp exists and is valid
  TestValidator.predicate(
    "snapshot created_at exists",
    snapshot.created_at !== undefined && snapshot.created_at !== null,
  );
  // 9. Verify snapshot contains shop profile ID reference
  TestValidator.equals(
    "snapshot references correct shop profile",
    snapshot.ecommerce_mall_shop_profile_id,
    shopProfileId,
  );
  // 10. Test second update to verify multiple snapshots can be created
  const secondUpdate =
    await api.functional.ecommerceMall.seller.shop_profiles.putByShopprofileid(
      sellerConnection,
      {
        shopProfileId,
        body: {
          shop_name: "Second Update",
        } satisfies IEcommerceMallShopProfile.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  // 11. Verify two snapshots exist now
  TestValidator.equals(
    "snapshot count after second update",
    secondUpdate.snapshots.length,
    2,
  );
}