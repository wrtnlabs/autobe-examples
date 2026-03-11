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
 * Test partial shop profile update where only required shop_name is provided.
 * Verifies that optional fields (shop_description, logo_image) are preserved
 * when omitted from the update request.
 */
export async function test_api_seller_shop_profile_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller connection and authenticate with complete profile
  const sellerConnection: api.IConnection = { host: connection.host };
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const initialLogoImage = "https://example.com/logo.png";
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(),
      shopDescription: initialDescription,
      logoImage: initialLogoImage,
    },
  });
  typia.assert(seller);
  // Step 2: Record initial values for comparison
  const initialShopName = seller.shop_name;
  // Step 3: Perform partial update with ONLY shop_name provided
  const newShopName = RandomGenerator.name();
  const updateBody = {
    shop_name: newShopName,
    // Omit shop_description and logo_image
  } satisfies IShoppingMallSeller.IUpdate;
  const updatedSeller =
    await api.functional.shoppingMall.customer.profile.update(
      sellerConnection,
      { body: updateBody },
    );
  typia.assert(updatedSeller);
  // Step 4: Verify shop_name was updated
  TestValidator.equals(
    "shop_name updated",
    updatedSeller.shop_name,
    newShopName,
  );
  TestValidator.notEquals(
    "shop_name changed",
    updatedSeller.shop_name,
    initialShopName,
  );
  // Step 5: Verify optional fields are preserved
  TestValidator.equals(
    "shop_description preserved",
    updatedSeller.shop_description,
    initialDescription,
  );
  TestValidator.equals(
    "logo_image preserved",
    updatedSeller.logo_image,
    initialLogoImage,
  );
  // Step 6: Verify seller id and email remain unchanged
  TestValidator.equals("seller id unchanged", updatedSeller.id, seller.id);
  TestValidator.equals(
    "seller email unchanged",
    updatedSeller.email,
    seller.email,
  );
}
