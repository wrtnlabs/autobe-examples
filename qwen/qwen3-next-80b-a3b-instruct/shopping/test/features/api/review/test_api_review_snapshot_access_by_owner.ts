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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_review_snapshot_access_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(sellerAuth);
  // 2. Seller creates a product with a variant
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<number & tags.Minimum<0.01>>(),
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(10),
            price: typia.random<number & tags.Minimum<0>>(),
            options: [
              { option_name: "Color", option_value: "Red" },
              { option_name: "Size", option_value: "Large" },
            ],
          },
        ],
      },
    },
  );
  typia.assert(product);
  // 3. Use seller's connection to search for reviews on their product
  // Since customer endpoint doesn't exist for login, and only seller endpoints are provided,
  // we'll use the seller's own connection to search for reviews (assuming seller can review their own product)
  const searchReviewsBody: IShoppingMallReview.IRequest = {
    product_id: product.id,
    page: 1,
    limit: 10,
  };
  // Search for reviews using seller's connection
  const reviewsResponse = await api.functional.shoppingMall.reviews.index(
    sellerConnection,
    {
      body: searchReviewsBody,
    },
  );
  typia.assert(reviewsResponse);
  let reviewId: string;
  if (reviewsResponse.data.length > 0) {
    // Use the first review
    reviewId = reviewsResponse.data[0].id;
  } else {
    // Generate synthetic review_id
    reviewId = typia.random<string & tags.Format<"uuid">>();
  }
  typia.assert(reviewId);
  // 4. Seller retrieves snapshot history for the review
  const snapshotResponse =
    await api.functional.shoppingMall.seller.reviews.snapshots.at(
      sellerConnection,
      {
        reviewId,
      },
    );
  typia.assert(snapshotResponse);
  // 5. Validate snapshots are in descending changed_at order
  const snapshots = snapshotResponse.data;
  if (snapshots.length === 0) {
    throw new Error("No snapshots found for review");
  }
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current",
    snapshotResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records > 0",
    snapshotResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    snapshotResponse.pagination.pages >= 1,
  );
  // Verify snapshots are ordered by changed_at descending
  for (let i = 0; i < snapshots.length - 1; i++) {
    const current = new Date(snapshots[i].changed_at);
    const next = new Date(snapshots[i + 1].changed_at);
    TestValidator.predicate("snapshots in descending order", current >= next);
  }
  // Verify all snapshots belong to the correct review
  for (const snapshot of snapshots) {
    TestValidator.equals(
      "snapshot.review_id matches review_id",
      snapshot.review_id,
      reviewId,
    );
  }
}
