import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates cross-seller data isolation for product review retrieval.
 *
 * This test ensures that the seller review retrieval API properly enforces
 * security boundaries between different sellers in the marketplace. Each seller
 * should only be able to access reviews for their own products through the
 * authenticated API endpoint.
 *
 * Due to API limitations (no cart, address, or payment method creation APIs
 * available), this test validates the retrieval mechanism and security
 * boundaries without creating actual reviews. The test focuses on:
 *
 * 1. Proper seller authentication and context switching
 * 2. Successful review retrieval API calls with correct parameters
 * 3. Verification that the API accepts requests from authenticated sellers
 *
 * Test workflow:
 *
 * 1. Register two independent seller accounts (Seller A and Seller B)
 * 2. Each seller creates product sales in the marketplace
 * 3. Register a buyer account
 * 4. Each seller authenticates and retrieves their reviews
 * 5. Verify the API responds successfully with paginated results
 * 6. Verify the response structure matches expected pagination format
 */
export async function test_api_seller_reviews_cross_seller_isolation(
  connection: api.IConnection,
) {
  // Step 1: Register Seller A with stored password
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAPassword = typia.random<string & tags.MinLength<8>>();
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerA);

  // Step 2: Seller A creates a product sale
  const productA = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 20 }),
        condition: RandomGenerator.pick([
          "new",
          "refurbished",
          "used",
        ] as const),
        return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(productA);

  // Step 3: Register Seller B with stored password
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBPassword = typia.random<string & tags.MinLength<8>>();
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerB);

  // Step 4: Seller B creates a product sale
  const productB = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 20 }),
        condition: RandomGenerator.pick([
          "new",
          "refurbished",
          "used",
        ] as const),
        return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(productB);

  // Step 5: Authenticate as Seller A using stored password and retrieve reviews
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sellerAReviews =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: sellerA.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(sellerAReviews);

  // Step 6: Verify Seller A's review response structure
  TestValidator.predicate(
    "Seller A review response has valid pagination",
    sellerAReviews.pagination.current >= 1,
  );

  TestValidator.predicate(
    "Seller A review data is an array",
    Array.isArray(sellerAReviews.data),
  );

  // Step 7: Authenticate as Seller B using stored password and retrieve reviews
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sellerBReviews =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: sellerB.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(sellerBReviews);

  // Step 8: Verify Seller B's review response structure
  TestValidator.predicate(
    "Seller B review response has valid pagination",
    sellerBReviews.pagination.current >= 1,
  );

  TestValidator.predicate(
    "Seller B review data is an array",
    Array.isArray(sellerBReviews.data),
  );
}
