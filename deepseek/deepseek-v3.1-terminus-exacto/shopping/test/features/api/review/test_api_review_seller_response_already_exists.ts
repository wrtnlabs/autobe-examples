import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewResponse";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_customer_products_reviews_create } from "../../../generate/generate_random_ecommerce_customer_products_reviews_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_reviews_seller_response_create_seller_response } from "../../../generate/generate_random_ecommerce_seller_products_reviews_seller_response_create_seller_response";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_review } from "../../../prepare/prepare_random_ecommerce_review";
import { prepare_random_ecommerce_review_response } from "../../../prepare/prepare_random_ecommerce_review_response";

export async function test_api_review_seller_response_already_exists(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Create product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Create review
  const review =
    await generate_random_ecommerce_customer_products_reviews_create(
      customerConnection,
      {
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceReview.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(review);
  // Create first seller response
  const firstResponse =
    await generate_random_ecommerce_seller_products_reviews_seller_response_create_seller_response(
      sellerConnection,
      {
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceReviewResponse.ICreate,
        params: {
          productId: product.id,
          reviewId: (review as any).id ?? typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(firstResponse);
  // Validate first response was created successfully
  TestValidator.equals(
    "first response should reference correct review",
    firstResponse.review.id,
    (review as any).id ?? typia.random<string & tags.Format<"uuid">>(),
  );
  TestValidator.equals(
    "first response should reference correct seller",
    firstResponse.seller.id,
    sellerAuth.id,
  );
  // Attempt to create second response to the same review - should fail
  await TestValidator.error(
    "should not allow multiple responses to same review",
    async () => {
      await generate_random_ecommerce_seller_products_reviews_seller_response_create_seller_response(
        sellerConnection,
        {
          body: {
            body: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IEcommerceReviewResponse.ICreate,
          params: {
            productId: product.id,
            reviewId: (review as any).id ?? typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );
}