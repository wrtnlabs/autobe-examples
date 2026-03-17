import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

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

export async function test_api_product_reviews_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Seller account and product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPass123!",
      href: "https://seller.example.com/join",
      referrer: "https://seller.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 2. Customer 1: Register and create review
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "CustomerPass123!",
      href: "https://customer.example.com/join",
      referrer: "https://customer.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const customer1Review =
    await generate_random_ecommerce_mall_customer_reviews_create(
      customer1Connection,
      {
        body: {
          product_id: product.id,
          rating: 5,
          title: "Great product!",
          body: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(customer1Review);
  // 3. Customer 2: Register and create review
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "CustomerPass456!",
      href: "https://customer2.example.com/join",
      referrer: "https://customer2.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const customer2Review =
    await generate_random_ecommerce_mall_customer_reviews_create(
      customer2Connection,
      {
        body: {
          product_id: product.id,
          rating: 4,
          title: "Good product",
          body: RandomGenerator.paragraph({ sentences: 4 }),
        },
      },
    );
  typia.assert(customer2Review);
  // 4. List reviews for the product
  const reviewsPage = await api.functional.ecommerceMall.products.reviews.index(
    connection,
    {
      productId: product.id,
      body: {
        page: 1,
        limit: 100,
        sort_by: "created_at",
        direction: "desc",
      },
    },
  );
  typia.assert(reviewsPage);
  // 5. Validate pagination metadata
  TestValidator.equals("total review count", reviewsPage.pagination.records, 2);
  TestValidator.equals("current page", reviewsPage.pagination.current, 1);
  TestValidator.equals("page limit", reviewsPage.pagination.limit, 100);
  TestValidator.equals("total pages", reviewsPage.pagination.pages, 1);
  // 6. Validate review data count
  TestValidator.equals("data array length", reviewsPage.data.length, 2);
  // 7. Validate reviews are sorted by newest first
  TestValidator.predicate("reviews sorted by newest first", () => {
    for (let i = 0; i < reviewsPage.data.length - 1; i++) {
      const curr = new Date(reviewsPage.data[i].created_at);
      const next = new Date(reviewsPage.data[i + 1].created_at);
      if (curr < next) return false;
    }
    return true;
  });
  // 8. Validate customer information in reviews
  TestValidator.equals(
    "first review customer id",
    reviewsPage.data[0].customer.id,
    customer1Review.customer.id,
  );
  TestValidator.equals(
    "first review customer email",
    reviewsPage.data[0].customer.email,
    customer1Review.customer.email,
  );
  TestValidator.equals(
    "second review customer id",
    reviewsPage.data[1].customer.id,
    customer2Review.customer.id,
  );
  TestValidator.equals(
    "second review customer email",
    reviewsPage.data[1].customer.email,
    customer2Review.customer.email,
  );
  // 9. Validate product information in reviews
  TestValidator.equals(
    "first review product id",
    reviewsPage.data[0].product.id,
    product.id,
  );
  TestValidator.equals(
    "second review product id",
    reviewsPage.data[1].product.id,
    product.id,
  );
  // 10. Validate rating constraints
  TestValidator.predicate("first review rating is valid (1-5)", () => {
    const rating = reviewsPage.data[0].rating;
    return rating >= 1 && rating <= 5;
  });
  TestValidator.predicate("second review rating is valid (1-5)", () => {
    const rating = reviewsPage.data[1].rating;
    return rating >= 1 && rating <= 5;
  });
  // 11. Validate is_verified_purchase is true
  TestValidator.equals(
    "first review is verified purchase",
    reviewsPage.data[0].is_verified_purchase,
    true,
  );
  TestValidator.equals(
    "second review is verified purchase",
    reviewsPage.data[1].is_verified_purchase,
    true,
  );
  // 12. Validate helpfulness_vote_count is non-negative
  TestValidator.predicate(
    "first review helpfulness vote count is non-negative",
    () => reviewsPage.data[0].helpfulness_vote_count >= 0,
  );
  TestValidator.predicate(
    "second review helpfulness vote count is non-negative",
    () => reviewsPage.data[1].helpfulness_vote_count >= 0,
  );
  // 13. Validate deleted_at is null for active reviews
  TestValidator.equals(
    "first review is active (not deleted)",
    reviewsPage.data[0].deleted_at,
    null,
  );
  TestValidator.equals(
    "second review is active (not deleted)",
    reviewsPage.data[1].deleted_at,
    null,
  );
  // 14. Validate title is either string or null
  TestValidator.predicate(
    "first review title is valid (string or null)",
    () => {
      const title = reviewsPage.data[0].title;
      return title === null || typeof title === "string";
    },
  );
  TestValidator.predicate(
    "second review title is valid (string or null)",
    () => {
      const title = reviewsPage.data[1].title;
      return title === null || typeof title === "string";
    },
  );
  // 15. Validate created_at is valid date-time
  TestValidator.predicate("first review created_at is valid date-time", () => {
    const date = new Date(reviewsPage.data[0].created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("second review created_at is valid date-time", () => {
    const date = new Date(reviewsPage.data[1].created_at);
    return !isNaN(date.getTime());
  });
  // 16. Validate updated_at is valid date-time
  TestValidator.predicate("first review updated_at is valid date-time", () => {
    const date = new Date(reviewsPage.data[0].updated_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("second review updated_at is valid date-time", () => {
    const date = new Date(reviewsPage.data[1].updated_at);
    return !isNaN(date.getTime());
  });
}
