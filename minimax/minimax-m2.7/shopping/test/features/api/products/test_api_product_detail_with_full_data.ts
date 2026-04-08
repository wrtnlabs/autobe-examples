import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_detail_with_full_data(
  connection: api.IConnection,
): Promise<void> {
  // Test the product detail endpoint which returns complete product information
  // including seller profile, images ordered by display order, variants with
  // option key-value pairs, computed prices/stock, and reviews ordered by newest.
  //
  // Since this endpoint doesn't require authorization (authorization-type: null),
  // we can directly call it with a product ID.
  //
  // For testing purposes, we'll use a test product ID or simulate.
  const productId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.ecommerceMall.products.at(connection, {
    productId,
  });
  typia.assert(product);
  // Validate seller profile structure
  TestValidator.predicate("seller profile exists", !!product.seller);
  TestValidator.predicate("seller has name", product.seller.name.length > 0);
  TestValidator.predicate(
    "seller has description",
    product.seller.description.length > 0,
  );
  TestValidator.predicate("seller has seller summary", !!product.seller.seller);
  // Validate product images are ordered by display order ascending
  if (product.productImages.length > 1) {
    for (let i = 0; i < product.productImages.length - 1; i++) {
      TestValidator.predicate(
        "images ordered by display order",
        product.productImages[i].displayOrder <=
          product.productImages[i + 1].displayOrder,
      );
    }
  }
  // Validate variants have option values with key-value pairs
  for (const variant of product.variants) {
    TestValidator.predicate(
      "variant has option values",
      variant.optionValues.length > 0,
    );
    TestValidator.predicate(
      "variant has valid inventory count",
      variant.inventoryCount >= 0,
    );
    // Each option value should have key and value
    for (const optionValue of variant.optionValues) {
      TestValidator.predicate(
        "option value has key",
        optionValue.key.length > 0,
      );
      TestValidator.predicate(
        "option value has value",
        optionValue.value.length > 0,
      );
    }
  }
  // Validate reviews are ordered by newest first (createdAt descending)
  if (product.reviews.length > 1) {
    for (let i = 0; i < product.reviews.length - 1; i++) {
      const current = new Date(product.reviews[i].createdAt);
      const next = new Date(product.reviews[i + 1].createdAt);
      TestValidator.predicate("reviews ordered newest first", current >= next);
    }
  }
  // Validate computed reviews count and average rating
  TestValidator.predicate(
    "reviews count is non-negative",
    product.reviewsCount >= 0,
  );
  TestValidator.predicate(
    "average rating is valid range",
    product.averageRating >= 0 && product.averageRating <= 5,
  );
  // If there are reviews, validate count matches actual reviews returned
  if (product.reviews.length > 0) {
    TestValidator.equals(
      "reviews count matches actual reviews",
      product.reviewsCount,
      product.reviews.length,
    );
  }
  // Validate timestamps exist
  TestValidator.predicate("has createdAt timestamp", !!product.createdAt);
  TestValidator.predicate("has updatedAt timestamp", !!product.updatedAt);
}
