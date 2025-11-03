import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_seller_profile_update_successful(
  connection: api.IConnection,
) {
  // Step 1: Seller joins and authenticates
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "securePassword123",
        store_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Create seller profile bound to seller id
  const profileCreateBody = {
    shopping_mall_seller_id: seller.id,
    store_name: RandomGenerator.name(),
    business_registration_number: `BRN-${RandomGenerator.alphaNumeric(10)}`,
    contact_email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    profile_description: RandomGenerator.paragraph({ sentences: 6 }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IShoppingMallSellerProfile.ICreate;

  const profile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellerProfiles.create(connection, {
      body: profileCreateBody,
    });
  typia.assert(profile);

  TestValidator.equals(
    "Seller ID matches",
    profile.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.predicate(
    "Profile has store name",
    typeof profile.store_name === "string" && profile.store_name.length > 0,
  );

  // Step 3: Update the seller profile with new valid data
  const profileUpdateBody = {
    store_name: RandomGenerator.name(),
    business_registration_number: `BRN-${RandomGenerator.alphaNumeric(10)}`,
    contact_email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    profile_description: RandomGenerator.paragraph({ sentences: 8 }),
    deleted_at: null,
  } satisfies IShoppingMallSellerProfile.IUpdate;

  const updatedProfile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellerProfiles.update(connection, {
      id: profile.id,
      body: profileUpdateBody,
    });
  typia.assert(updatedProfile);

  TestValidator.equals("Profile ID unchanged", updatedProfile.id, profile.id);
  TestValidator.equals(
    "Seller ID unchanged",
    updatedProfile.shopping_mall_seller_id,
    profile.shopping_mall_seller_id,
  );

  TestValidator.notEquals(
    "Store name changed",
    updatedProfile.store_name,
    profile.store_name,
  );
  TestValidator.notEquals(
    "Business registration number changed",
    updatedProfile.business_registration_number,
    profile.business_registration_number,
  );
  TestValidator.notEquals(
    "Contact email changed",
    updatedProfile.contact_email,
    profile.contact_email,
  );
  TestValidator.notEquals(
    "Contact phone changed",
    updatedProfile.contact_phone,
    profile.contact_phone,
  );
  TestValidator.notEquals(
    "Profile description changed",
    updatedProfile.profile_description,
    profile.profile_description,
  );

  // Timestamps should be ISO 8601 strings
  TestValidator.predicate(
    "Created at is ISO string",
    typeof updatedProfile.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        updatedProfile.created_at,
      ),
  );
  TestValidator.predicate(
    "Updated at is ISO string",
    typeof updatedProfile.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        updatedProfile.updated_at,
      ),
  );
}
