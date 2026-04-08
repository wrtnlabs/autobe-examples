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

/**
 * Test partial seller profile update where seller modifies only shop_name field.
 *
 * Validates that partial updates work correctly by modifying only the shop_name while leaving shop_description and logo_image_url unchanged. This ensures sellers can update individual profile fields without affecting other data.
 *
 * The test verifies that the response contains the updated shop_name with original values preserved for other fields, and that the updated_at timestamp reflects the modification time.
 *
 * 1. Register and authenticate a new seller using authorize_seller_join utility.
 * 2. Prepare partial update payload containing only shop_name field.
 * 3. Call PATCH /shoppingMall/seller-profiles with the partial update request.
 * 4. Validate response structure and confirm shop_name was updated.
 * 5. Verify shop_description and logo_image_url remain at their original values.
 * 6. Confirm updated_at timestamp is later than created_at indicating modification.
 */
export async function test_api_seller_profile_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Prepare partial update payload with only shop_name
  const newShopName = RandomGenerator.name(2);
  const updateBody = {
    shopName: newShopName,
  } satisfies IShoppingMallSellerProfile.IUpdate;
  // 3. Call PATCH endpoint for partial update
  const updatedProfile =
    await api.functional.shoppingMall.seller_profiles.update(sellerConnection, {
      body: updateBody,
    });
  typia.assert(updatedProfile);
  // 4. Validate shop_name was updated to the new value
  TestValidator.equals(
    "shop_name updated",
    updatedProfile.shop_name,
    newShopName,
  );
  // 5. Verify other fields remain unchanged (exist with valid values)
  TestValidator.predicate(
    "shop_description exists",
    updatedProfile.shop_description.length > 0,
  );
  TestValidator.predicate(
    "logo_image_url is nullable",
    updatedProfile.logo_image_url === null ||
      typeof updatedProfile.logo_image_url === "string",
  );
  // 6. Confirm updated_at timestamp reflects modification
  TestValidator.predicate(
    "updated_at after created_at",
    new Date(updatedProfile.updated_at) >= new Date(updatedProfile.created_at),
  );
  // 7. Verify seller reference is preserved
  TestValidator.equals(
    "seller id preserved",
    updatedProfile.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller email preserved",
    updatedProfile.seller.email,
    sellerAuth.email,
  );
}
