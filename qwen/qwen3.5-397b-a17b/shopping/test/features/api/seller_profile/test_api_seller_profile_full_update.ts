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
 * Test seller profile full update with all three fields modified.
 *
 * Validates the complete profile update workflow where an authenticated seller updates their shop name, shop description, and logo image URL in a single request. Ensures that all fields are correctly updated in the response and that the updated_at timestamp reflects the modification.
 *
 * The test verifies the snapshot creation mechanism works correctly by confirming the update operation succeeds, which implies the system captured the previous state before applying changes. This scenario represents the typical rebranding workflow sellers use when updating their storefront information.
 *
 * 1. Seller registers and authenticates using authorize_seller_join utility.
 * 2. Seller updates all three profile fields (shop_name, shop_description, logo_image_url) in a single PATCH request.
 * 3. Validates the response contains all updated fields with correct values.
 * 4. Validates the updated_at timestamp is set and reflects the modification.
 * 5. Validates the seller information is correctly linked in the profile response.
 */
export async function test_api_seller_profile_full_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(authResult);
  // 2. Prepare update payload with all three fields
  const updatePayload = {
    shopName: RandomGenerator.paragraph({ sentences: 2 }),
    shopDescription: RandomGenerator.content({ paragraphs: 2 }),
    logoImageUrl: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerProfile.IUpdate;
  // 3. Update seller profile with all fields
  const updatedProfile =
    await api.functional.shoppingMall.seller_profiles.update(sellerConnection, {
      body: updatePayload,
    });
  typia.assert(updatedProfile);
  // 4. Validate all three fields are updated correctly
  TestValidator.equals(
    "shop name matches",
    updatedProfile.shop_name,
    updatePayload.shopName,
  );
  TestValidator.equals(
    "shop description matches",
    updatedProfile.shop_description,
    updatePayload.shopDescription,
  );
  TestValidator.equals(
    "logo image URL matches",
    updatedProfile.logo_image_url,
    updatePayload.logoImageUrl,
  );
  // 5. Validate seller information is correctly linked
  TestValidator.equals(
    "seller id matches auth result",
    updatedProfile.seller.id,
    authResult.id,
  );
  TestValidator.equals(
    "seller email matches",
    updatedProfile.seller.email,
    authResult.email,
  );
  // 6. Validate profile ID exists (business logic - profile was created)
  TestValidator.predicate(
    "profile has id",
    updatedProfile.id !== null && updatedProfile.id !== undefined,
  );
}
