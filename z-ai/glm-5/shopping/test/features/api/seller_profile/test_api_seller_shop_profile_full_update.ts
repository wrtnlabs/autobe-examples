import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the primary success path for updating a seller's complete shop profile.
 * This test validates that a seller can update their shop profile with new
 * shop_name, shop_description, and logo_image values.
 */
export async function test_api_seller_shop_profile_full_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(1),
      shopDescription: RandomGenerator.paragraph({ sentences: 3 }),
      logoImage: typia.random<string & tags.Format<"url">>(),
    },
  });
  typia.assert(sellerAuth);
  // Step 2: Store original values for comparison
  const originalShopName = sellerAuth.shop_name;
  const originalShopDescription = sellerAuth.shop_description;
  const originalLogoImage = sellerAuth.logo_image;
  const originalUpdatedAt = sellerAuth.updated_at;
  // Step 3: Prepare update data with new values
  const newShopName = RandomGenerator.name(2);
  const newShopDescription = RandomGenerator.paragraph({ sentences: 5 });
  const newLogoImage = typia.random<string & tags.Format<"url">>();
  const updateBody = {
    shop_name: newShopName,
    shop_description: newShopDescription,
    logo_image: newLogoImage,
  } satisfies IShoppingMallSeller.IUpdate;
  // Step 4: Call the profile update endpoint
  const updatedSeller =
    await api.functional.shoppingMall.customer.profile.update(
      sellerConnection,
      { body: updateBody },
    );
  typia.assert(updatedSeller);
  // Step 5: Verify shop_name was updated
  TestValidator.equals(
    "shop_name should be updated",
    updatedSeller.shop_name,
    newShopName,
  );
  TestValidator.notEquals(
    "shop_name should differ from original",
    updatedSeller.shop_name,
    originalShopName,
  );
  // Step 6: Verify shop_description was updated
  TestValidator.equals(
    "shop_description should be updated",
    updatedSeller.shop_description,
    newShopDescription,
  );
  TestValidator.notEquals(
    "shop_description should differ from original",
    updatedSeller.shop_description,
    originalShopDescription,
  );
  // Step 7: Verify logo_image was updated
  TestValidator.equals(
    "logo_image should be updated",
    updatedSeller.logo_image,
    newLogoImage,
  );
  TestValidator.notEquals(
    "logo_image should differ from original",
    updatedSeller.logo_image,
    originalLogoImage,
  );
  // Step 8: Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at should differ from original",
    updatedSeller.updated_at,
    originalUpdatedAt,
  );
  // Step 9: Verify other fields remain unchanged
  TestValidator.equals(
    "seller id should remain same",
    updatedSeller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "email should remain same",
    updatedSeller.email,
    sellerAuth.email,
  );
}
