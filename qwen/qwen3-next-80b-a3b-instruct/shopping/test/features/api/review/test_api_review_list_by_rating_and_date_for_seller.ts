import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionItem";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_review_list_by_rating_and_date_for_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a seller account and get authenticated connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create a product that will have reviews (assuming reviews already exist on this product)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Minimum<0.01> & tags.Type<"uint32">
        >(),
        variants: ArrayUtil.repeat(
          2,
          () =>
            ({
              sku_code: RandomGenerator.alphaNumeric(8),
              price: typia.random<
                number & tags.Minimum<0> & tags.Type<"uint32">
              >(),
              options: ArrayUtil.repeat(
                2,
                () =>
                  ({
                    option_name: RandomGenerator.alphabets(6),
                    option_value: RandomGenerator.alphabets(5),
                  }) as IShoppingMallProductVariantOptionItem,
              ),
            }) satisfies IShoppingMallProductVariant.ICreate,
        ),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Calculate date range (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // 4. Query reviews with rating range 3-5 and date range last 30 days
  const request: IShoppingMallReview.IRequest = {
    product_id: product.id,
    rating_range: {
      min: 3,
      max: 5,
    },
    created_at_range: {
      start: thirtyDaysAgo.toISOString(),
      end: now.toISOString(),
    },
    sort: "newest",
    limit: 100, // Get all reviews
  };
  const response = await api.functional.shoppingMall.reviews.index(
    sellerConnection,
    {
      body: request,
    },
  );
  typia.assert(response);
  // 5. Validate response
  const reviews = response.data as IShoppingMallReview.ISummary[];
  // Ensure only non-deleted reviews are included
  TestValidator.predicate(
    "no deleted reviews",
    reviews.every((r) => !r.is_deleted),
  );
  // Ensure rating filter is correct
  TestValidator.predicate(
    "all ratings in range 3-5",
    reviews.every((r) => r.rating >= 3 && r.rating <= 5),
  );
  // Ensure date filter is correct
  TestValidator.predicate(
    "all reviews within last 30 days",
    reviews.every((r) => {
      const reviewDate = new Date(r.created_at);
      return reviewDate >= thirtyDaysAgo && reviewDate <= now;
    }),
  );
  // Ensure sorting is by created_at DESC (newest first)
  for (let i = 0; i < reviews.length - 1; i++) {
    TestValidator.predicate(
      "reviews sorted by created_at DESC",
      new Date(reviews[i].created_at) >= new Date(reviews[i + 1].created_at),
    );
  }
  // Ensure content is nullable (null or string)
  reviews.forEach((r) => {
    TestValidator.predicate(
      "content is string or null",
      r.content === null || typeof r.content === "string",
    );
  });
  // Check pagination metadata
  TestValidator.equals(
    "pagination matches total reviews",
    response.pagination.records,
    reviews.length,
  );
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is 100",
    response.pagination.limit === 100,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    response.pagination.pages <= Math.ceil(reviews.length / 100),
  );
}
