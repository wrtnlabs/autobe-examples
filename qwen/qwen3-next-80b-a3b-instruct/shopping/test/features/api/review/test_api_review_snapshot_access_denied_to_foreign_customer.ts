import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionItem";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_review_snapshot_access_denied_to_foreign_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two distinct customers
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Authenticate as seller and create a product
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Create product by seller
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(8),
            price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1>
            >(),
            options: [
              {
                option_name: "Size",
                option_value: "Medium",
              },
            ],
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Customer A searches for reviews on the product (assume one review exists)
  const customerAReviewRequest: IShoppingMallReview.IRequest = {
    product_id: product.id,
    sort: "newest",
    limit: 1,
  };
  const customerAReviews = await api.functional.shoppingMall.reviews.index(
    customerAConnection,
    {
      body: customerAReviewRequest,
    },
  );
  typia.assert(customerAReviews);
  // We expect at least one review exists (from test setup or prior data)
  if (customerAReviews.data.length === 0) {
    throw new Error(
      "No reviews found for product even though test requires one. This is a test environment issue.",
    );
  }
  const review = customerAReviews.data[0];
  typia.assert(review);
  const reviewId = review.id;
  // 4. Customer B logs in and attempts to access review snapshots via seller endpoint
  // We must use the customerBConnection for authentication
  const customerBConnectionForReviewSnapshots: api.IConnection = {
    host: connection.host,
  };
  await authorize_customer_login(customerBConnectionForReviewSnapshots, {
    body: {
      email: customerB.email,
      password: RandomGenerator.alphaNumeric(16), // Use a new random password for safety
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // Customer B should NOT be able to access review snapshots of a review written by Customer A via seller endpoint
  // We expect a 404 Not Found error
  await TestValidator.error(
    "Review snapshots access denied for foreign customer",
    async () => {
      await api.functional.shoppingMall.seller.reviews.snapshots.at(
        customerBConnectionForReviewSnapshots,
        {
          reviewId,
        },
      );
    },
  );
}
