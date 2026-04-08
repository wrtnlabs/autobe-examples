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
 * Test seller profile update with all available fields.
 *
 * Validates the complete seller shop profile update workflow including authentication, profile modification with all fields, and response validation. Ensures that the profile is successfully updated with shop name, description, and logo image URL, and that the updated timestamp reflects the modification.
 *
 * The test creates a seller account through registration, updates the profile with randomized values for all three mutable fields, and validates the response contains the updated information with proper timestamps.
 *
 * 1. Seller registers through join endpoint with randomized credentials.
 * 2. Seller creates update request with new shop name, description, and logo URL.
 * 3. Profile is updated via PUT endpoint with all three fields.
 * 4. Validates response contains updated values and new timestamp.
 */
export async function test_api_seller_profile_update_full_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Get initial profile from seller auth response
  const initialProfile = sellerAuth.profile;
  if (!initialProfile) {
    throw new Error("Seller profile should exist after registration");
  }
  // 3. Prepare update data with all three fields
  const updateData = {
    shop_name: RandomGenerator.name(3),
    shop_description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_image_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceSellerProfile.IUpdate;
  // 4. Update seller profile with all fields
  const updatedProfile =
    await api.functional.ecommerce.seller.profiles.putByProfileid(
      sellerConnection,
      {
        profileId: initialProfile.id,
        body: updateData,
      },
    );
  typia.assert(updatedProfile);
  // 5. Validate all fields were updated correctly
  TestValidator.equals(
    "shop name updated",
    updatedProfile.shop_name,
    updateData.shop_name,
  );
  TestValidator.equals(
    "shop description updated",
    updatedProfile.shop_description,
    updateData.shop_description,
  );
  TestValidator.equals(
    "logo image URL updated",
    updatedProfile.logo_image_url,
    updateData.logo_image_url,
  );
  // 6. Validate timestamp was updated
  TestValidator.predicate(
    "updated_at changed",
    updatedProfile.updated_at > initialProfile.updated_at,
  );
  // 7. Validate seller relationship is preserved
  TestValidator.equals(
    "seller ID preserved",
    updatedProfile.seller.id,
    sellerAuth.id,
  );
}
