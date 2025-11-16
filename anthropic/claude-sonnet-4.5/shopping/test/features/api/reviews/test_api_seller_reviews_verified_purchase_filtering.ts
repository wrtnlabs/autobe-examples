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
 * Test filtering reviews by verified purchase status to help sellers prioritize
 * authentic customer feedback.
 *
 * This test validates the verified_purchase_only filter parameter acceptance
 * and response structure for seller review management. Since the
 * is_verified_purchase flag is set automatically by the backend based on order
 * delivery status (and cannot be controlled during review creation), this test
 * focuses on verifying the filtering endpoint accepts the parameter correctly
 * and returns valid responses.
 *
 * Test workflow:
 *
 * 1. Register and authenticate seller account with stored credentials
 * 2. Create product listing for reviews to reference
 * 3. Register multiple buyer accounts with stored credentials
 * 4. Create product reviews (backend determines verification status)
 * 5. Test verified_purchase_only=true filter parameter
 * 6. Validate response structure and pagination
 * 7. Test verified_purchase_only=false filter parameter
 * 8. Validate response structure for inclusive filtering
 */
export async function test_api_seller_reviews_verified_purchase_filtering(
  connection: api.IConnection,
) {
  // Step 1: Register seller account and store credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = `${RandomGenerator.alphabets(10)}123!`;

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: "https://marketplace.example.com/seller/register",
      referrer: "https://marketplace.example.com/seller/info",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create product listing
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const product = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: categoryId,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 20 }),
        brand: RandomGenerator.name(1),
        condition: "new" as const,
        return_policy_days: 30 as const,
        warranty_info: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create buyer accounts with stored credentials
  const buyer1Email = typia.random<string & tags.Format<"email">>();
  const buyer1Password = `${RandomGenerator.alphabets(10)}456!`;

  const buyer1 = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyer1Email,
      password: buyer1Password,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://marketplace.example.com/buyer/register",
      referrer: "https://marketplace.example.com/home",
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer1);

  const buyer2Email = typia.random<string & tags.Format<"email">>();
  const buyer2Password = `${RandomGenerator.alphabets(10)}789!`;

  const buyer2 = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyer2Email,
      password: buyer2Password,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://marketplace.example.com/buyer/register",
      referrer: "https://marketplace.example.com/products",
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer2);

  // Step 4: Create product reviews
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const orderId1 = typia.random<string & tags.Format<"uuid">>();

  // Buyer 1 login with correct password and create review
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyer1Email,
      password: buyer1Password,
      href: "https://marketplace.example.com/products",
      referrer: "https://marketplace.example.com/home",
    } satisfies IShoppingMallBuyer.ILogin,
  });

  const review1 = await api.functional.shoppingMall.buyer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_sale_id: product.id,
        shopping_mall_sale_sku_id: skuId,
        shopping_mall_order_id: orderId1,
        star_rating: 5,
        review_title: RandomGenerator.paragraph({ sentences: 2 }),
        review_body: RandomGenerator.paragraph({ sentences: 15 }),
        is_anonymous: false,
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review1);

  // Buyer 2 login with correct password and create review
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyer2Email,
      password: buyer2Password,
      href: "https://marketplace.example.com/products",
      referrer: "https://marketplace.example.com/orders",
    } satisfies IShoppingMallBuyer.ILogin,
  });

  const orderId2 = typia.random<string & tags.Format<"uuid">>();
  const review2 = await api.functional.shoppingMall.buyer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_sale_id: product.id,
        shopping_mall_sale_sku_id: skuId,
        shopping_mall_order_id: orderId2,
        star_rating: 4,
        review_title: RandomGenerator.paragraph({ sentences: 2 }),
        review_body: RandomGenerator.paragraph({ sentences: 12 }),
        is_anonymous: false,
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review2);

  // Step 5: Switch to seller account to retrieve reviews
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://marketplace.example.com/seller/dashboard",
      referrer: "https://marketplace.example.com/seller/products",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 6: Test verified_purchase_only=true filter
  const verifiedOnlyResult =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        verified_purchase_only: true,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(verifiedOnlyResult);

  // Validate response structure
  TestValidator.equals(
    "verified filter pagination current page",
    verifiedOnlyResult.pagination.current,
    1,
  );

  TestValidator.predicate(
    "verified filter response should have data array",
    Array.isArray(verifiedOnlyResult.data),
  );

  // If there are verified reviews, validate their properties
  if (verifiedOnlyResult.data.length > 0) {
    TestValidator.predicate(
      "all returned reviews should be verified purchases",
      verifiedOnlyResult.data.every(
        (review) => review.is_verified_purchase === true,
      ),
    );
  }

  // Step 7: Test verified_purchase_only=false filter (inclusive)
  const allReviewsResult =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        verified_purchase_only: false,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(allReviewsResult);

  // Validate inclusive filtering response
  TestValidator.equals(
    "all reviews filter pagination current page",
    allReviewsResult.pagination.current,
    1,
  );

  TestValidator.predicate(
    "all reviews filter should return data array",
    Array.isArray(allReviewsResult.data),
  );

  // Step 8: Test without verified_purchase_only filter (omitted)
  const defaultFilterResult =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(defaultFilterResult);

  TestValidator.predicate(
    "default filter should return valid response structure",
    Array.isArray(defaultFilterResult.data),
  );
}
