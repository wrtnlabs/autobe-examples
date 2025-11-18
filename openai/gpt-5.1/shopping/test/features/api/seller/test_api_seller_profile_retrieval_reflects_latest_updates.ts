import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate that seller profile retrieval reflects the latest updates.
 *
 * Business context:
 *
 * - A seller joins the shopping mall platform and then configures their
 *   public-facing profile (store name, description, support contacts).
 * - The seller portal typically performs an update and then immediately reads the
 *   profile again to re-populate the edit form or summary view.
 *
 * This test ensures that:
 *
 * 1. After an initial profile update, GET
 *    /shoppingMall/seller/sellers/{sellerId}/profile returns a representation
 *    consistent with the update response.
 * 2. After a second update with new values, a subsequent GET returns the most
 *    recent data, not a stale cached version.
 * 3. Timestamps behave correctly: created_at remains stable while updated_at moves
 *    forward across updates.
 */
export async function test_api_seller_profile_retrieval_reflects_latest_updates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const authorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const sellerId = authorized.id;

  // 2. First profile update with known values
  const supportEmailV1 = typia.random<string & tags.Format<"email">>();
  const supportPhoneV1 = RandomGenerator.mobile();
  const updateBodyV1 = {
    store_name: `Store v1 ${RandomGenerator.name(1)}`,
    store_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    support_email: supportEmailV1,
    support_phone: supportPhoneV1,
  } satisfies IShoppingMallSellerProfile.IUpdate;

  const profileV1: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellers.profile.update(
      connection,
      {
        sellerId,
        body: updateBodyV1,
      },
    );
  typia.assert(profileV1);

  // 3. First profile read and consistency check
  const profileAfterV1: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellers.profile.at(connection, {
      sellerId,
    });
  typia.assert(profileAfterV1);

  // Basic identity checks
  TestValidator.equals(
    "profile id should be stable between updateV1 and readV1",
    profileAfterV1.id,
    profileV1.id,
  );
  TestValidator.equals(
    "profile seller id matches authorized seller id",
    profileAfterV1.shopping_mall_seller_id,
    sellerId,
  );

  // Field-level equality for V1
  TestValidator.equals(
    "store_name after first read matches first update",
    profileAfterV1.store_name,
    updateBodyV1.store_name,
  );
  TestValidator.equals(
    "store_description after first read matches first update",
    profileAfterV1.store_description,
    updateBodyV1.store_description,
  );
  TestValidator.equals(
    "support_email after first read matches first update",
    profileAfterV1.support_email,
    updateBodyV1.support_email,
  );
  TestValidator.equals(
    "support_phone after first read matches first update",
    profileAfterV1.support_phone,
    updateBodyV1.support_phone,
  );

  // Timestamp behavior for V1
  TestValidator.equals(
    "created_at is identical between updateV1 and readV1",
    profileAfterV1.created_at,
    profileV1.created_at,
  );
  TestValidator.equals(
    "updated_at is identical between updateV1 and readV1",
    profileAfterV1.updated_at,
    profileV1.updated_at,
  );

  // Ensure updated_at is not before created_at (string comparison on ISO 8601 works)
  TestValidator.predicate("updated_at should be >= created_at (V1)", () => {
    return profileAfterV1.updated_at >= profileAfterV1.created_at;
  });

  // 4. Second profile update with changed values
  const supportEmailV2 = typia.random<string & tags.Format<"email">>();
  const supportPhoneV2 = RandomGenerator.mobile();
  const updateBodyV2 = {
    store_name: `Store v2 ${RandomGenerator.name(1)}`,
    // Explicitly clear the description to validate null handling
    store_description: null,
    support_email: supportEmailV2,
    support_phone: supportPhoneV2,
  } satisfies IShoppingMallSellerProfile.IUpdate;

  const profileV2: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellers.profile.update(
      connection,
      {
        sellerId,
        body: updateBodyV2,
      },
    );
  typia.assert(profileV2);

  // Confirm updated fields reflect V2
  TestValidator.equals(
    "store_name after second update matches V2 body",
    profileV2.store_name,
    updateBodyV2.store_name,
  );
  TestValidator.equals(
    "store_description after second update matches V2 body (null)",
    profileV2.store_description,
    updateBodyV2.store_description,
  );
  TestValidator.equals(
    "support_email after second update matches V2 body",
    profileV2.support_email,
    updateBodyV2.support_email,
  );
  TestValidator.equals(
    "support_phone after second update matches V2 body",
    profileV2.support_phone,
    updateBodyV2.support_phone,
  );

  // updated_at should move forward, created_at should remain stable
  TestValidator.equals(
    "created_at remains stable across updates",
    profileV2.created_at,
    profileAfterV1.created_at,
  );
  TestValidator.predicate(
    "updated_at after second update should be >= updated_at after first read",
    () => profileV2.updated_at >= profileAfterV1.updated_at,
  );

  // 5. Second profile read and strong consistency check
  const profileAfterV2: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellers.profile.at(connection, {
      sellerId,
    });
  typia.assert(profileAfterV2);

  TestValidator.equals(
    "profile id should be stable between updateV2 and readV2",
    profileAfterV2.id,
    profileV2.id,
  );
  TestValidator.equals(
    "seller id remains consistent on second read",
    profileAfterV2.shopping_mall_seller_id,
    sellerId,
  );

  // Fields must reflect latest update (V2)
  TestValidator.equals(
    "store_name after second read matches V2 body",
    profileAfterV2.store_name,
    updateBodyV2.store_name,
  );
  TestValidator.equals(
    "store_description after second read matches V2 body (null)",
    profileAfterV2.store_description,
    updateBodyV2.store_description,
  );
  TestValidator.equals(
    "support_email after second read matches V2 body",
    profileAfterV2.support_email,
    updateBodyV2.support_email,
  );
  TestValidator.equals(
    "support_phone after second read matches V2 body",
    profileAfterV2.support_phone,
    updateBodyV2.support_phone,
  );

  // Timestamp monotonicity across reads
  TestValidator.equals(
    "created_at remains identical between updateV2 and readV2",
    profileAfterV2.created_at,
    profileV2.created_at,
  );
  TestValidator.predicate(
    "updated_at after second read should be >= updated_at after first read",
    () => profileAfterV2.updated_at >= profileAfterV1.updated_at,
  );
}
