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

export async function test_api_customer_review_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup: create account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(sellerAuthorized);
  // Login seller to get fresh token
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginAuthorized: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_login(sellerLoginConnection, {
      body: {
        email: sellerAuthorized.email,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallSeller.ILogin,
    });
  typia.assert(sellerLoginAuthorized);
  // 2. Seller creates product
  const product: IEcommerceMallProduct =
    await api.functional.ecommerceMall.seller.products.create(
      sellerLoginConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 3. Customer setup: create account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(customerAuthorized);
  // Login customer to get fresh token
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLoginAuthorized: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_login(customerLoginConnection, {
      body: {
        email: customerAuthorized.email,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallCustomer.ILogin,
    });
  typia.assert(customerLoginAuthorized);
  // 4. Create order with delivered status (simulated)
  const orderId: string = typia.random<string & tags.Format<"uuid">>();
  const order: IEcommerceMallOrder.ISummary = {
    id: orderId,
    order_number: RandomGenerator.alphaNumeric(12),
    total_price: product.base_price,
    status: "delivered",
    shipping_address: {
      id: typia.random<string & tags.Format<"uuid">>(),
      recipient_name: RandomGenerator.name(),
      recipient_phone: RandomGenerator.mobile(),
      street: RandomGenerator.paragraph({ sentences: 2 }),
      city: RandomGenerator.name(2),
      state: RandomGenerator.alphabets(5),
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    } satisfies IEcommerceMallAddress.ISummary,
    created_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IEcommerceMallOrder.ISummary;
  // 5. Customer creates review
  const reviewRating:
    | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>)
    | undefined = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const reviewBody: string = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
  });
  const review: IEcommerceMallReview =
    await api.functional.ecommerceMall.customer.reviews.create(
      customerLoginConnection,
      {
        body: {
          rating: reviewRating,
          title: RandomGenerator.name(2) || null,
          body: reviewBody,
          product_id: product.id,
          order_id: orderId,
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(review);
  // 6. Validate review structure
  TestValidator.equals("review has valid id", review.id !== undefined, true);
  TestValidator.equals(
    "review customer matches",
    review.customer.id,
    customerAuthorized.id,
  );
  TestValidator.equals("review product matches", review.product.id, product.id);
  TestValidator.equals("review order matches", review.order.id, orderId);
  TestValidator.equals(
    "review rating is valid range",
    review.rating,
    reviewRating,
  );
  TestValidator.equals(
    "review body is non-empty",
    review.body.length > 0,
    true,
  );
  TestValidator.equals(
    "review is verified purchase",
    review.is_verified_purchase,
    true,
  );
  TestValidator.notEquals(
    "review has created_at timestamp",
    review.created_at,
    undefined,
  );
  TestValidator.notEquals(
    "review has updated_at timestamp",
    review.updated_at,
    undefined,
  );
}