import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller profile partial update with shop name modification only.
 *
 * Validates that sellers can perform partial updates to their shop profiles by modifying only the shop name while preserving existing description and logo image URL values. The test ensures the system correctly handles requests with a subset of fields and maintains data integrity for unchanged fields.
 *
 * This test verifies the partial update functionality of the seller profile endpoint, ensuring that only specified fields are modified while all other fields remain intact. The snapshot system should still create an immutable record of the change.
 *
 * 1. Seller authenticates via join endpoint with randomized credentials.
 * 2. Extract profile ID from the authorized seller response.
 * 3. Capture original profile values (shop_name, shop_description, logo_image_url).
 * 4. Submit partial update request with only shop_name field modified.
 * 5. Validate response contains updated shop_name with unchanged description and logo.
 * 6. Verify all profile fields maintain correct structure and types.
 */
export async function test_api_seller_profile_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(authorized);
  // 2. Extract profile ID
  const profile = typia.assert(authorized.profile!);
  const profileId: string & tags.Format<"uuid"> = profile.id;
  // 3. Capture original profile values
  const originalShopName: string = profile.shop_name;
  const originalDescription: string | null = profile.shop_description;
  const originalLogoUrl: (string & tags.Format<"uri">) | null =
    profile.logo_image_url;
  // 4. Submit partial update with only shop_name
  const newShopName: string = RandomGenerator.name(3);
  const updated = await api.functional.ecommerce.seller.profiles.putByProfileid(
    sellerConnection,
    {
      profileId,
      body: {
        shop_name: newShopName,
      } satisfies IEcommerceSellerProfile.IUpdate,
    },
  );
  typia.assert(updated);
  // 5. Validate shop_name changed
  TestValidator.equals("shop name updated", updated.shop_name, newShopName);
  // 6. Validate description unchanged
  TestValidator.equals(
    "shop description preserved",
    updated.shop_description,
    originalDescription,
  );
  // 7. Validate logo_image_url unchanged
  TestValidator.equals(
    "logo image URL preserved",
    updated.logo_image_url,
    originalLogoUrl,
  );
  // 8. Verify other profile fields remain valid
  TestValidator.equals("profile ID unchanged", updated.id, profileId);
  TestValidator.predicate(
    "created_at exists",
    updated.created_at !== null && updated.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    updated.updated_at !== null && updated.updated_at !== undefined,
  );
  TestValidator.predicate(
    "seller relation exists",
    updated.seller !== null && updated.seller !== undefined,
  );
}
