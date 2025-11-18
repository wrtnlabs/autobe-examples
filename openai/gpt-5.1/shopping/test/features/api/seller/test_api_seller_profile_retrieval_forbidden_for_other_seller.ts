import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate that seller-facing profile retrieval is restricted to the
 * authenticated seller and forbids access to another seller's profile.
 *
 * Business goal:
 *
 * - Ensure that `GET /shoppingMall/seller/sellers/{sellerId}/profile` enforces
 *   ownership constraints. A seller must only be able to view their own
 *   profile; attempts to view another seller's profile must fail with an
 *   authorization error.
 *
 * High-level flow:
 *
 * 1. Register Seller A via `POST /auth/seller/join`.
 *
 *    - Body: `IShoppingMallSellerAuthJoin.IRequest` with random but valid
 *         email/password/href/referrer.
 *    - Response: `IShoppingMallSeller.IAuthorized` (contains sellerIdA and tokenA).
 * 2. Register Seller B via `POST /auth/seller/join`.
 *
 *    - Separate random credentials and context.
 *    - Response: `IShoppingMallSeller.IAuthorized` (contains sellerIdB and tokenB),
 *         and the shared `connection` now carries Seller B's token.
 * 3. Build two logical connections to represent each actor without mutating
 *    headers in test logic:
 *
 *    - `sellerAConn`: clone of base connection with its own `headers` object whose
 *         `Authorization` is set to tokenA.access.
 *    - `sellerBConn`: reuse the existing `connection` (already authenticated as
 *         Seller B from the second join) as the principal for Seller B.
 * 4. Positive control: Using Seller B, fetch Seller B's profile.
 *
 *    - Call `api.functional.shoppingMall.seller.sellers.profile.at` with `sellerId:
 *         sellerIdB` and connection authenticated as Seller B.
 *    - Assert response shape with `typia.assert<IShoppingMallSellerProfile>`.
 *    - Assert `shopping_mall_seller_id` matches `sellerIdB` using
 *         `TestValidator.equals` with a descriptive title.
 * 5. Core security check: Using Seller A, attempt to fetch Seller B's profile.
 *
 *    - Call `at` with `sellerId: sellerIdB` but connection authenticated as Seller A
 *         (`sellerAConn`).
 *    - Wrap the call in `await TestValidator.error("title", async () => ...)`.
 *    - Expect the call to throw due to authorization failure; do not inspect HTTP
 *         status code or error message.
 * 6. Optional sanity: Using Seller A, fetch Seller A's own profile.
 *
 *    - Call `at` with `sellerId: sellerIdA` on `sellerAConn`.
 *    - Assert shape and that `shopping_mall_seller_id` equals `sellerIdA`.
 *
 * Type and data generation notes:
 *
 * - Join bodies use `satisfies IShoppingMallSellerAuthJoin.IRequest` and random
 *   values from `typia.random` for constrained formats:
 *
 *   - `email`: `string & tags.Format<"email">`.
 *   - `password`: `string & tags.Format<"password">`.
 *   - `href`/`referrer`: `string & tags.Format<"uri">`.
 *   - `ip` can be omitted entirely to keep the DTO simple.
 * - We rely on the SDK to handle authentication and token setting during `join`
 *   calls. For simulating multiple principals concurrently, we create dedicated
 *   `IConnection` objects for Seller A using the captured access token, while
 *   the original `connection` represents Seller B.
 */
export async function test_api_seller_profile_retrieval_forbidden_for_other_seller(
  connection: api.IConnection,
) {
  // 1. Register Seller A (first seller)
  const sellerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAAuthorized);

  const sellerAId = sellerAAuthorized.id;
  const sellerAToken: IAuthorizationToken = sellerAAuthorized.token;
  typia.assert<IAuthorizationToken>(sellerAToken);

  // Create dedicated connection for Seller A using its access token.
  const sellerAConn: api.IConnection = {
    ...connection,
    headers: {
      ...(connection.headers ?? {}),
      Authorization: sellerAToken.access,
    },
  };

  // 2. Register Seller B (second seller) using the original connection.
  const sellerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerBAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerBAuthorized);

  const sellerBId = sellerBAuthorized.id;
  const sellerBToken: IAuthorizationToken = sellerBAuthorized.token;
  typia.assert<IAuthorizationToken>(sellerBToken);

  // At this point, `connection` is authenticated as Seller B due to join.
  const sellerBConn: api.IConnection = connection;

  // 3. Positive control: Seller B retrieves their own profile successfully.
  const sellerBProfile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellers.profile.at(sellerBConn, {
      sellerId: sellerBId,
    });
  typia.assert<IShoppingMallSellerProfile>(sellerBProfile);

  TestValidator.equals(
    "seller B profile belongs to seller B",
    sellerBProfile.shopping_mall_seller_id,
    sellerBId,
  );

  // 4. Core security check: Seller A must not be able to access Seller B's profile.
  await TestValidator.error(
    "seller A cannot access seller B profile",
    async () => {
      await api.functional.shoppingMall.seller.sellers.profile.at(sellerAConn, {
        sellerId: sellerBId,
      });
    },
  );

  // 5. Optional sanity: Seller A can access their own profile.
  const sellerAProfile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellers.profile.at(sellerAConn, {
      sellerId: sellerAId,
    });
  typia.assert<IShoppingMallSellerProfile>(sellerAProfile);

  TestValidator.equals(
    "seller A profile belongs to seller A",
    sellerAProfile.shopping_mall_seller_id,
    sellerAId,
  );
}
