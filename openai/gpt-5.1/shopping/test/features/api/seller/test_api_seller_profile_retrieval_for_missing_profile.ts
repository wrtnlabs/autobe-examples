import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate seller profile retrieval for a newly registered seller.
 *
 * Business goal: Ensure that when a seller account has just been created,
 * calling the seller profile endpoint returns a profile that is safely bound to
 * that seller and does not leak any other seller’s data. We slightly adapt the
 * textual requirement (which allowed 404 or an uninitialized representation) to
 * the concrete SDK contract that always returns an `IShoppingMallSellerProfile`
 * instance on success.
 *
 * Steps:
 *
 * 1. Register first seller (sellerA) via POST /auth/seller/join.
 *
 *    - Use typia.random<IShoppingMallSellerAuthJoin.IRequest>() for the join body.
 *    - Assert the returned IShoppingMallSeller.IAuthorized structure.
 * 2. Immediately call GET /shoppingMall/seller/sellers/{sellerId}/profile with
 *    sellerA.id.
 *
 *    - Expect a successful response of type IShoppingMallSellerProfile.
 *    - Assert the structure with typia.assert.
 *    - Validate that `profile.shopping_mall_seller_id === sellerA.id`.
 *    - If `profile.seller` (summary) is present:
 *
 *         - Assert it with typia.assert.
 *         - Validate `profile.seller.id === sellerA.id`.
 *         - Validate `profile.seller.email === sellerA.email`.
 * 3. Register a second seller (sellerB) as a control.
 *
 *    - Use another typia.random<IShoppingMallSellerAuthJoin.IRequest>().
 *    - Assert the returned IShoppingMallSeller.IAuthorized.
 * 4. Re-read sellerA’s profile again using profile.at(sellerId: sellerA.id).
 *
 *    - Assert with typia.assert.
 *    - If `profile.seller` is present, validate that `profile.seller.id !==
 *         sellerB.id` to ensure no cross-seller leakage.
 * 5. Business assertions using TestValidator:
 *
 *    - The profile is consistently bound to sellerA via both
 *         `shopping_mall_seller_id` and optional `seller.id`.
 *    - If a second seller exists, the first seller’s profile never references
 *         sellerB’s id.
 *
 * Error handling:
 *
 * - We do not assert on HTTP error codes or simulate 404 scenarios, because the
 *   generated SDK and types express only the success path for the profile
 *   retrieval. Instead, we focus on verifying correct seller/profile binding
 *   and absence of data leakage.
 */
export async function test_api_seller_profile_retrieval_for_missing_profile(
  connection: api.IConnection,
) {
  // 1. Register first seller (sellerA)
  const sellerAJoinBody = typia.random<IShoppingMallSellerAuthJoin.IRequest>();

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerA);

  // 2. Fetch sellerA profile
  const profileA: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellers.profile.at(connection, {
      sellerId: sellerA.id,
    });
  typia.assert<IShoppingMallSellerProfile>(profileA);

  // Validate that profile is bound to sellerA
  TestValidator.equals(
    "profileA.shopping_mall_seller_id must equal sellerA.id",
    profileA.shopping_mall_seller_id,
    sellerA.id,
  );

  if (profileA.seller !== undefined) {
    typia.assert<IShoppingMallSeller.ISummary>(profileA.seller);

    TestValidator.equals(
      "embedded seller summary id must equal sellerA.id",
      profileA.seller.id,
      sellerA.id,
    );

    TestValidator.equals(
      "embedded seller summary email must equal sellerA.email",
      profileA.seller.email,
      sellerA.email,
    );
  }

  // 3. Register second seller (sellerB) as a control
  const sellerBJoinBody = typia.random<IShoppingMallSellerAuthJoin.IRequest>();

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerB);

  // 4. Re-read sellerA profile again and ensure no leakage from sellerB
  const profileAAgain: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellers.profile.at(connection, {
      sellerId: sellerA.id,
    });
  typia.assert<IShoppingMallSellerProfile>(profileAAgain);

  TestValidator.equals(
    "profileAAgain.shopping_mall_seller_id must still equal sellerA.id",
    profileAAgain.shopping_mall_seller_id,
    sellerA.id,
  );

  if (profileAAgain.seller !== undefined) {
    typia.assert<IShoppingMallSeller.ISummary>(profileAAgain.seller);

    TestValidator.equals(
      "reloaded embedded seller summary id must equal sellerA.id",
      profileAAgain.seller.id,
      sellerA.id,
    );

    TestValidator.notEquals(
      "embedded seller summary must not reference sellerB.id",
      profileAAgain.seller.id,
      sellerB.id,
    );
  }
}
