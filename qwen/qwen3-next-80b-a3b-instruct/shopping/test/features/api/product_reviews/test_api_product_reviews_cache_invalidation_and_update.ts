import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_section } from "../../../prepare/prepare_random_shopping_mall_section";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_reviews_cache_invalidation_and_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: `https://${RandomGenerator.alphaNumeric(12)}.com`,
        referrer: `https://${RandomGenerator.alphaNumeric(10)}.com/referral`,
      },
    },
  );
  typia.assert(admin);
  // Step 2: Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(seller);
  // Step 3: Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: `https://${RandomGenerator.alphaNumeric(12)}.com`,
        referrer: `https://${RandomGenerator.alphaNumeric(10)}.com/referral`,
      },
    });
  typia.assert(customer);
  // Step 4: Create root category using admin connection
  const category: IShoppingMallSection =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
        },
      },
    );
  typia.assert(category);
  // Step 5: Create product using seller connection
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.categoryId,
        },
      },
    );
  typia.assert(product);
  // Extract product_id from product response
  const productId = (product as any).id as string;
  // Step 6: Create initial review using customer connection
  const firstReview: IShoppingMallReview =
    await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          rating: 5,
          text: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(firstReview);
  // Extract review_id from review response
  const firstReviewId = (firstReview as any).id as string;
  // Step 7: Verify initial cached reviews data
  const initialReviews: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.customer.reviews.index(
      customerConnection,
      {
        body: { product_id: productId },
      },
    );
  typia.assert(initialReviews);
  TestValidator.equals(
    "initial review count",
    initialReviews.data[0].reviewCount,
    1,
  );
  TestValidator.equals(
    "initial average rating",
    initialReviews.data[0].averageRating,
    5,
  );
  // Step 8: Create second review using customer connection
  const secondReview: IShoppingMallReview =
    await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          rating: 3,
          text: RandomGenerator.paragraph({ sentences: 4 }),
        },
      },
    );
  typia.assert(secondReview);
  // Extract review_id from review response
  const secondReviewId = (secondReview as any).id as string;
  // Step 9: Verify cache invalidation after second review
  const updatedReviews: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.customer.reviews.index(
      customerConnection,
      {
        body: { product_id: productId },
      },
    );
  typia.assert(updatedReviews);
  TestValidator.equals(
    "updated review count",
    updatedReviews.data[0].reviewCount,
    2,
  );
  TestValidator.equals(
    "updated average rating",
    updatedReviews.data[0].averageRating,
    4,
  ); // (5 + 3) / 2 = 4
  // Step 10: Delete first review using customer connection
  await api.functional.shoppingMall.customer.reviews.erase(customerConnection, {
    reviewId: firstReviewId,
  });
  // Step 11: Verify cache invalidation after deletion
  const finalReviews: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.customer.reviews.index(
      customerConnection,
      {
        body: { product_id: productId },
      },
    );
  typia.assert(finalReviews);
  TestValidator.equals(
    "final review count",
    finalReviews.data[0].reviewCount,
    2,
  ); // Customer-deleted review still counted
  TestValidator.equals(
    "final average rating",
    finalReviews.data[0].averageRating,
    3,
  ); // Only second review rating contributes to average
}
