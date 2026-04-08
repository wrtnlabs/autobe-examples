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

export async function test_api_seller_shop_profile_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
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
  // 2. Create initial shop profile with all three fields
  const initialShopName = RandomGenerator.paragraph({ sentences: 3 });
  const initialDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const initialLogoUrl = typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri"> & tags.MaxLength<80000>;
  // First PUT call creates the shop profile
  let shopProfile =
    await api.functional.ecommerceMall.seller.shop_profiles.putByShopprofileid(
      sellerConnection,
      {
        shopProfileId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          shop_name: initialShopName,
          shop_description: initialDescription,
          logo_url: initialLogoUrl satisfies string & tags.Format<"uri"> & tags.MaxLength<80000>,
        } satisfies IEcommerceMallShopProfile.IUpdate,
      },
    );
  typia.assert(shopProfile);
  const shopProfileId = shopProfile.id;
  // 3. Update shop profile with only shop_name field (partial update)
  const newShopName = RandomGenerator.paragraph({ sentences: 3 });
  const updatedProfile =
    await api.functional.ecommerceMall.seller.shop_profiles.putByShopprofileid(
      sellerConnection,
      {
        shopProfileId: shopProfileId,
        body: {
          shop_name: newShopName,
        } satisfies IEcommerceMallShopProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Verify shop_name field was updated to the new value
  TestValidator.equals(
    "shop_name updated",
    updatedProfile.shop_name,
    newShopName,
  );
  // 5. Verify shop_description field retained original value
  TestValidator.equals(
    "shop_description unchanged",
    updatedProfile.shop_description,
    initialDescription,
  );
  // 6. Verify logo_url field retained original value
  TestValidator.equals(
    "logo_url unchanged",
    updatedProfile.logo_url,
    initialLogoUrl,
  );
  // 7. Verify updated_at timestamp is newer than created_at
  TestValidator.predicate(
    "updated_at is newer than created_at",
    () =>
      new Date(updatedProfile.updated_at) > new Date(updatedProfile.created_at),
  );
  // 8. Verify snapshot was created with original values
  TestValidator.equals(
    "snapshot contains original shop_name",
    updatedProfile.snapshots.length,
    1,
  );
  const snapshot = updatedProfile.snapshots[0];
  TestValidator.equals(
    "snapshot has original shop_name",
    snapshot.shop_name,
    initialShopName,
  );
  TestValidator.equals(
    "snapshot has original shop_description",
    snapshot.shop_description,
    initialDescription,
  );
  TestValidator.equals(
    "snapshot has original logo_url",
    snapshot.logo_url,
    initialLogoUrl,
  );
}