import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_review_admin_rating_correction(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections for proper isolation
  const adminConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  // 1. Setup - Create and authenticate all actors
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: typia.random<number & tags.Type<"uint32">>() + 1000,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Customer submits first review with rating 3
  const initialRating = 3 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  const review1 = await generate_random_ecommerce_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        rating: initialRating,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review1);
  // 4. Admin queries reviews and verifies initial rating statistics
  const reviewsPage1 =
    await api.functional.ecommerceMall.products.reviews.index(adminConnection, {
      productId: product.id,
      body: {
        productId: product.id,
        customerId: null,
        minRating: null,
        maxRating: null,
        createdAfter: null,
        createdBefore: null,
        search: null,
        sort: "newest",
        includeDeleted: null,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(reviewsPage1);
  // Verify single review data
  TestValidator.equals(
    "review count should be 1",
    reviewsPage1.pagination.records,
    1,
  );
  TestValidator.equals(
    "review rating should match",
    reviewsPage1.data[0]?.rating,
    initialRating,
  );
  TestValidator.equals(
    "review content should match",
    reviewsPage1.data[0]?.content,
    review1.content,
  );
  // 5. Customer submits second review with rating 5 to test aggregate calculation
  const secondRating = 5 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  const review2 = await generate_random_ecommerce_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        rating: secondRating,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review2);
  // 6. Admin queries reviews again and verifies updated statistics
  const reviewsPage2 =
    await api.functional.ecommerceMall.products.reviews.index(adminConnection, {
      productId: product.id,
      body: {
        productId: product.id,
        customerId: null,
        minRating: null,
        maxRating: null,
        createdAfter: null,
        createdBefore: null,
        search: null,
        sort: "newest",
        includeDeleted: null,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(reviewsPage2);
  // Verify aggregate statistics
  TestValidator.equals(
    "review count should be 2",
    reviewsPage2.pagination.records,
    2,
  );
  // Verify rating range filtering works correctly (admin checks ratings in range)
  const highRatedReviews =
    await api.functional.ecommerceMall.products.reviews.index(adminConnection, {
      productId: product.id,
      body: {
        productId: product.id,
        customerId: null,
        minRating: 4,
        maxRating: 5,
        createdAfter: null,
        createdBefore: null,
        search: null,
        sort: "newest",
        includeDeleted: null,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(highRatedReviews);
  TestValidator.equals(
    "high rated count should be 1",
    highRatedReviews.pagination.records,
    1,
  );
  TestValidator.equals(
    "high rated review should be 5 stars",
    highRatedReviews.data[0]?.rating,
    5,
  );
  // Verify pagination works correctly
  const pagedReviews =
    await api.functional.ecommerceMall.products.reviews.index(adminConnection, {
      productId: product.id,
      body: {
        productId: product.id,
        customerId: null,
        minRating: null,
        maxRating: null,
        createdAfter: null,
        createdBefore: null,
        search: null,
        sort: "newest",
        includeDeleted: null,
        page: 1,
        limit: 1,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(pagedReviews);
  TestValidator.equals(
    "page limit should be respected",
    pagedReviews.pagination.limit,
    1,
  );
  TestValidator.equals(
    "records should show total count",
    pagedReviews.pagination.records,
    2,
  );
  TestValidator.equals(
    "pages should be calculated correctly",
    pagedReviews.pagination.pages,
    2,
  );
}
