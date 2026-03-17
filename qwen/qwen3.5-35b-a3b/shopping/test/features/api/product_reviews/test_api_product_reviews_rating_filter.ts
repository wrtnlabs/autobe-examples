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

export async function test_api_product_reviews_rating_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. First customer - 1-star review
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Auth = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer1Auth);
  const review1 = await generate_random_ecommerce_mall_customer_reviews_create(
    customer1Connection,
    {
      body: {
        rating: 1,
        title: "Terrible experience",
        body: RandomGenerator.paragraph({ sentences: 3 }),
        product_id: product.id,
        order_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review1);
  // 4. Second customer - 3-star review
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Auth = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer2Auth);
  const review2 = await generate_random_ecommerce_mall_customer_reviews_create(
    customer2Connection,
    {
      body: {
        rating: 3,
        title: "Average product",
        body: RandomGenerator.paragraph({ sentences: 2 }),
        product_id: product.id,
        order_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review2);
  // 5. Third customer - 5-star review
  const customer3Connection: api.IConnection = { host: connection.host };
  const customer3Auth = await authorize_customer_join(customer3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer3Auth);
  const review3 = await generate_random_ecommerce_mall_customer_reviews_create(
    customer3Connection,
    {
      body: {
        rating: 5,
        title: "Excellent product!",
        body: RandomGenerator.paragraph({ sentences: 2 }),
        product_id: product.id,
        order_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review3);
  // 6. Test min_rating=4 filter (should return only 5-star review)
  const minRatingResult =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId: product.id,
      body: {
        min_rating: 4,
        limit: 100,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(minRatingResult);
  TestValidator.equals(
    "min_rating=4 returns only 4+ star reviews",
    minRatingResult.data.every((r) => r.rating >= 4),
    true,
  );
  // 7. Test max_rating=3 filter (should return only 1 and 3-star reviews)
  const maxRatingResult =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId: product.id,
      body: {
        max_rating: 3,
        limit: 100,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(maxRatingResult);
  TestValidator.equals(
    "max_rating=3 returns only 3- star reviews",
    maxRatingResult.data.every((r) => r.rating <= 3),
    true,
  );
  // 8. Test combined min_rating=2 and max_rating=4 filter
  const rangeFilterResult =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId: product.id,
      body: {
        min_rating: 2,
        max_rating: 4,
        limit: 100,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(rangeFilterResult);
  TestValidator.equals(
    "min=2 max=4 returns only reviews in range",
    rangeFilterResult.data.every((r) => r.rating >= 2 && r.rating <= 4),
    true,
  );
}