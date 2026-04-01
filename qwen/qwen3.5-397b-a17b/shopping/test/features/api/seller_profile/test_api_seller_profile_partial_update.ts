import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Perform initial full profile update to establish baseline values
  const initialShopName = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.content({ paragraphs: 2 });
  const initialLogoUri = typia.assert<string & tags.MaxLength<80000> & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>());
  const initialProfile =
    await api.functional.shoppingMall.sellers.profile.update(sellerConnection, {
      body: {
        shop_name: initialShopName,
        description: initialDescription,
        logo_image_uri: initialLogoUri,
      } satisfies IShoppingMallSellerProfile.IUpdate,
    });
  typia.assert(initialProfile);
  // 3. Perform partial update with only shop_name field
  const updatedShopName = RandomGenerator.paragraph({ sentences: 3 });
  const updatedProfile =
    await api.functional.shoppingMall.sellers.profile.update(sellerConnection, {
      body: {
        shop_name: updatedShopName,
      } satisfies IShoppingMallSellerProfile.IUpdate,
    });
  typia.assert(updatedProfile);
  // 4. Verify profile ID remains consistent
  TestValidator.equals(
    "profile id consistent",
    updatedProfile.id,
    initialProfile.id,
  );
  // 5. Verify partial update behavior - only shop_name changed
  TestValidator.equals(
    "shop_name updated",
    updatedProfile.shop_name,
    updatedShopName,
  );
  TestValidator.equals(
    "description unchanged",
    updatedProfile.description,
    initialDescription,
  );
  TestValidator.equals(
    "logo_image_uri unchanged",
    updatedProfile.logo_image_uri,
    initialLogoUri,
  );
  // 6. Verify updated_at timestamp reflects the modification
  TestValidator.predicate("updated_at is later", () => {
    return (
      new Date(updatedProfile.updated_at).getTime() >=
      new Date(initialProfile.updated_at).getTime()
    );
  });
  // 7. Verify seller information remains consistent
  TestValidator.equals(
    "seller id consistent",
    updatedProfile.seller.id,
    sellerAuth.id,
  );
}