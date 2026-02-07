import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_ecommerce_categories_create } from "../../../generate/generate_random_ecommerce_categories_create";
import { generate_random_ecommerce_products_create } from "../../../generate/generate_random_ecommerce_products_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";

export async function test_api_product_reviews_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create category for product
  const category = await generate_random_ecommerce_categories_create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  // 2. Create product using category
  const product = await generate_random_ecommerce_products_create(connection, {
    body: {
      name: RandomGenerator.name(3),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      basePrice: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000>
      >(),
      categoriesId: category.id,
    },
  });
  // 3. Retrieve product reviews with default pagination (page=1, limit=10)
  const reviews = await api.functional.ecommerce.products.patchByProductid(
    connection,
    {
      productId: product.id,
      body: {
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(reviews);
  // 4. Validate pagination metadata
  TestValidator.equals("pagination total", reviews.pagination.records, 5);
  TestValidator.equals("pagination pages", reviews.pagination.pages, 1);
  // 5. Validate all reviews are active (deleted_at is null)
  reviews.data.forEach((review) => {
    TestValidator.equals("active review", review.deleted_at, null);
  });
  // 6. Validate sorted by creation date (newest first)
  for (let i = 0; i < reviews.data.length - 1; i++) {
    const current = new Date(reviews.data[i].created_at);
    const next = new Date(reviews.data[i + 1].created_at);
    TestValidator.predicate(
      `reviews sorted correctly (current: ${i}, next: ${i + 1})`,
      current >= next,
    );
  }
  // 7. Validate required fields for each review
  reviews.data.forEach((review) => {
    TestValidator.predicate(
      "rating 1-5",
      review.rating >= 1 && review.rating <= 5,
    );
    TestValidator.predicate(
      "review has product relationship",
      !!review.product,
    );
    TestValidator.predicate(
      "product relationship matches",
      review.product.id === product.id,
    );
    TestValidator.predicate(
      "review has customer relationship",
      !!review.customer,
    );
    TestValidator.predicate(
      "comment is nullable",
      typeof review.comment === "string" || review.comment === null,
    );
  });
}
