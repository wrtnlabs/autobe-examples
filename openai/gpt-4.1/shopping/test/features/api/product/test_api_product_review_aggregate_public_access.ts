import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingReviewRatingAggregate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewRatingAggregate";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Public access to product review aggregate statistics.
 *
 * This test verifies that aggregate review statistics (such as average rating
 * and total number of reviews) for a product are accessible without
 * authentication. It covers both valid and invalid product IDs, including
 * business rules for error handling.
 *
 * Steps:
 *
 * 1. Register a seller (no prior authentication required).
 * 2. Create a product as the seller and obtain its productId.
 * 3. As an unauthenticated user, retrieve the product's aggregate review
 *    statistics using the public API endpoint.
 * 4. Validate that all fields (average_rating, review_count,
 *    product_average_rating, product_review_count, etc.) exist and are
 *    correctly formatted according to the DTO.
 * 5. Confirm that the endpoint does not require authentication by calling it with
 *    a bare connection (no token attached).
 * 6. Test with a random (non-existent or invalid) productId and verify an error is
 *    thrown.
 */
export async function test_api_product_review_aggregate_public_access(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    },
  });
  typia.assert(sellerJoin);

  // 2. Create a product
  const productCreate = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 8 }),
        main_image_uri:
          "https://picsum.photos/600/600?" + RandomGenerator.alphaNumeric(8),
        status: "draft",
        business_status: "in_review",
      },
    },
  );
  typia.assert(productCreate);

  // 3. Retrieve review aggregate publicly
  const reviewAggregate =
    await api.functional.shopping.products.reviewAggregates.at(connection, {
      productId: productCreate.id,
    });
  typia.assert(reviewAggregate);
  TestValidator.equals(
    "review aggregate's productId matches product",
    reviewAggregate.shopping_product_id,
    productCreate.id,
  );

  // 4. Validate fields exist and are type-correct (typia.assert already checks types)
  // 5. Confirm endpoint accessibility without authentication
  // Connection has no token management here; just re-instantiate headers as empty
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const reviewAggregateNoAuth =
    await api.functional.shopping.products.reviewAggregates.at(unauthConn, {
      productId: productCreate.id,
    });
  typia.assert(reviewAggregateNoAuth);
  TestValidator.equals(
    "unauthenticated aggregate's productId matches product",
    reviewAggregateNoAuth.shopping_product_id,
    productCreate.id,
  );

  // 6. Query with a random, non-existent UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("error for non-existent productId", async () => {
    await api.functional.shopping.products.reviewAggregates.at(unauthConn, {
      productId: nonExistentId,
    });
  });
}
