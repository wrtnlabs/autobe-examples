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
import type { IShoppingMallReviewSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSellerResponse";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test filtering reviews by seller response status to help sellers identify
 * reviews requiring responses.
 *
 * Business Context: Sellers need efficient tools to manage customer reviews and
 * identify which reviews need attention. The has_seller_response filter enables
 * sellers to prioritize unanswered reviews and track their customer engagement
 * efforts. This functionality is critical for maintaining good seller-customer
 * relationships and improving store reputation through responsive customer
 * service.
 *
 * Test Workflow:
 *
 * 1. Register seller account who will receive and respond to reviews
 * 2. Create multiple product sales to generate review opportunities
 * 3. Create multiple buyer accounts and orders to generate diverse reviews
 * 4. Submit multiple reviews from different buyers
 * 5. Create seller responses for a subset of reviews
 * 6. Validate filtering with has_seller_response=false returns only unanswered
 *    reviews
 * 7. Validate filtering with has_seller_response=true returns only answered
 *    reviews
 * 8. Validate filtering without the parameter returns all reviews
 *
 * Expected Outcomes:
 *
 * - Sellers can accurately identify which reviews need responses
 * - Filtering correctly distinguishes between answered and unanswered reviews
 * - Review management workflow supports efficient seller engagement
 */
export async function test_api_seller_reviews_unanswered_identification(
  connection: api.IConnection,
) {
  // Step 1: Register seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.name(3),
        business_description: RandomGenerator.paragraph({ sentences: 10 }),
        store_name: RandomGenerator.name(2),
        href: "https://marketplace.example.com/seller/register",
        referrer: "https://marketplace.example.com/seller/info",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Create product sales
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const sale1: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: categoryId,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 14,
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(sale1);

  const sale2: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: categoryId,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(sale2);

  // Step 3: Create buyer accounts, orders, and reviews
  const reviewsData: Array<{
    review: IShoppingMallReview;
    shouldHaveResponse: boolean;
  }> = [];

  // Create 5 buyers with reviews - 3 will get responses, 2 will not
  const buyerCount = 5;
  for (let i = 0; i < buyerCount; i++) {
    const buyerEmail = typia.random<string & tags.Format<"email">>();
    const buyer: IShoppingMallBuyer.IAuthorized =
      await api.functional.auth.buyer.join(connection, {
        body: {
          email: buyerEmail,
          password: RandomGenerator.alphaNumeric(10),
          full_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          href: "https://marketplace.example.com/buyer/register",
          referrer: "https://marketplace.example.com",
        } satisfies IShoppingMallBuyer.ICreate,
      });
    typia.assert(buyer);

    // Create order
    const cartItemIds = [typia.random<string & tags.Format<"uuid">>()];
    const buyerAddressId = typia.random<string & tags.Format<"uuid">>();
    const paymentMethodId = typia.random<string & tags.Format<"uuid">>();

    const order: IShoppingMallOrder =
      await api.functional.shoppingMall.buyer.orders.create(connection, {
        body: {
          cart_item_ids: cartItemIds,
          buyer_address_id: buyerAddressId,
          payment_method_id: paymentMethodId,
        } satisfies IShoppingMallOrder.ICreate,
      });
    typia.assert(order);

    // Submit review
    const sale = i % 2 === 0 ? sale1 : sale2;
    const saleSkuId = typia.random<string & tags.Format<"uuid">>();

    const review: IShoppingMallReview =
      await api.functional.shoppingMall.buyer.reviews.create(connection, {
        body: {
          shopping_mall_sale_id: sale.id,
          shopping_mall_sale_sku_id: saleSkuId,
          shopping_mall_order_id: order.id,
          star_rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          review_title: RandomGenerator.paragraph({ sentences: 4 }),
          review_body: RandomGenerator.content({ paragraphs: 2 }),
          is_anonymous: false,
        } satisfies IShoppingMallReview.ICreate,
      });
    typia.assert(review);

    // First 3 reviews will get seller responses, last 2 will not
    reviewsData.push({
      review: review,
      shouldHaveResponse: i < 3,
    });
  }

  // Step 4: Switch back to seller and create responses for subset of reviews
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://marketplace.example.com/seller/login",
      referrer: "https://marketplace.example.com/seller",
    } satisfies IShoppingMallSeller.ILogin,
  });

  const reviewsWithResponses: string[] = [];
  const reviewsWithoutResponses: string[] = [];

  for (const reviewData of reviewsData) {
    if (reviewData.shouldHaveResponse) {
      const sellerResponse: IShoppingMallReviewSellerResponse =
        await api.functional.shoppingMall.seller.reviews.sellerResponse.create(
          connection,
          {
            reviewId: reviewData.review.id,
            body: {
              response_body: RandomGenerator.content({
                paragraphs: 1,
                sentenceMin: 10,
                sentenceMax: 15,
              }),
            } satisfies IShoppingMallReviewSellerResponse.ICreate,
          },
        );
      typia.assert(sellerResponse);
      reviewsWithResponses.push(reviewData.review.id);
    } else {
      reviewsWithoutResponses.push(reviewData.review.id);
    }
  }

  // Step 5: Test filtering with has_seller_response=false (unanswered reviews)
  const unansweredResult: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        has_seller_response: false,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(unansweredResult);

  TestValidator.equals(
    "unanswered reviews count should match reviews without responses",
    unansweredResult.data.length,
    reviewsWithoutResponses.length,
  );

  const unansweredIds = unansweredResult.data.map((r) => r.id);
  for (const expectedId of reviewsWithoutResponses) {
    TestValidator.predicate(
      `unanswered review ${expectedId} should be in results`,
      unansweredIds.includes(expectedId),
    );
  }

  // Step 6: Test filtering with has_seller_response=true (answered reviews)
  const answeredResult: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        has_seller_response: true,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(answeredResult);

  TestValidator.equals(
    "answered reviews count should match reviews with responses",
    answeredResult.data.length,
    reviewsWithResponses.length,
  );

  const answeredIds = answeredResult.data.map((r) => r.id);
  for (const expectedId of reviewsWithResponses) {
    TestValidator.predicate(
      `answered review ${expectedId} should be in results`,
      answeredIds.includes(expectedId),
    );
  }

  // Step 7: Test without has_seller_response filter (all reviews)
  const allReviewsResult: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {} satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(allReviewsResult);

  TestValidator.equals(
    "all reviews count should match total reviews created",
    allReviewsResult.data.length,
    reviewsData.length,
  );

  const allReviewIds = allReviewsResult.data.map((r) => r.id);
  for (const reviewData of reviewsData) {
    TestValidator.predicate(
      `review ${reviewData.review.id} should be in unfiltered results`,
      allReviewIds.includes(reviewData.review.id),
    );
  }
}
