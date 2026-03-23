import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
import { generate_random_ecommerce_mall_customer_products_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_products_reviews_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_seller_review_snapshot_access_for_their_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup: seller creates product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoinInput,
  });
  typia.assert(sellerAuthorized);
  // Create a new seller connection with the token
  const sellerConnectionWithToken: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerAuthorized.token.access },
  };
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnectionWithToken,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        is_available: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 2. Customer setup: customer writes review
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinInput = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerJoinInput,
  });
  typia.assert(customerAuthorized);
  // Create a new customer connection with the token
  const customerConnectionWithToken: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerAuthorized.token.access },
  };
  // Generate a random product for the review to ensure it belongs to the seller
  const review =
    await api.functional.ecommerceMall.customer.products.reviews.create(
      customerConnectionWithToken,
      {
        productId: product.id,
        body: {
          order_item_id: typia.random<string & tags.Format<"uuid">>(),
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          text_content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(review);
  // 3. Customer deletes the review (creates a 'deleted' snapshot)
  await api.functional.ecommerceMall.customer.reviews.erase(
    customerConnectionWithToken,
    {
      reviewId: review.id,
    },
  );
  // 4. Seller accesses the review snapshots for their product
  const snapshots =
    await api.functional.ecommerceMall.customer.reviews.snapshots.at(
      sellerConnectionWithToken,
      {
        reviewId: review.id,
      },
    );
  typia.assert(snapshots);
  // Verify that the snapshot contains the expected information
  TestValidator.equals("review ID matches", snapshots.review.id, review.id);
  TestValidator.predicate(
    "snapshot type is deleted",
    snapshots.snapshot_type === "deleted",
  );
}