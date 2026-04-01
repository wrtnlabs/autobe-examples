import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving complete product details with variants and images.
 *
 * This test validates the GET /shoppingMall/products/{productId} endpoint returns
 * a complete product entity with all nested relations including seller info,
 * category hierarchy, product images sorted by display order, variants with
 * option combinations, option definitions, and aggregated rating information.
 */
export async function test_api_product_detail_retrieval_with_variants_and_images(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random product UUID for testing
  // In a real E2E environment, this would use a product ID from setup data
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve product details
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.products.at(connection, {
      productId,
    });
  // Validate complete response structure
  typia.assert(product);
  // Validate product is active (not deleted)
  TestValidator.predicate("product is active", product.deleted_at === null);
  // Validate product id matches request
  TestValidator.equals("product id matches", product.id, productId);
  // Validate seller approval status is one of the allowed values
  TestValidator.predicate(
    "seller approval status is valid",
    ["pending", "approved", "rejected"].includes(
      product.seller.approval_status,
    ),
  );
  // Validate product images are sorted by display_order
  if (product.images.length > 0) {
    const sortedImages = [...product.images].sort(
      (a, b) => a.display_order - b.display_order,
    );
    TestValidator.equals(
      "images are sorted by display_order",
      product.images.map((img) => img.display_order),
      sortedImages.map((img) => img.display_order),
    );
    // Validate first image is thumbnail (display_order = 0)
    const firstImage = product.images.find((img) => img.display_order === 0);
    TestValidator.predicate(
      "first image exists as thumbnail",
      firstImage !== undefined,
    );
  }
  // Validate product variants have option values
  if (product.variants.length > 0) {
    product.variants.forEach((variant) => {
      TestValidator.predicate(
        "variant has option values",
        variant.variantOptions.length > 0,
      );
      // Validate each variant option has proper structure
      variant.variantOptions.forEach((option) => {
        TestValidator.predicate(
          "option definition exists",
          option.optionDefinition !== null,
        );
      });
    });
  }
  // Validate option definitions have values and option values belong to correct definition
  if (product.optionDefinitions.length > 0) {
    product.optionDefinitions.forEach((def) => {
      TestValidator.predicate(
        "option definition has values",
        def.optionValues.length > 0,
      );
      // Validate option values belong to this definition
      def.optionValues.forEach((value) => {
        TestValidator.equals(
          "option value belongs to definition",
          value.optionDefinition.id,
          def.id,
        );
      });
    });
  }
  // Validate rating information
  TestValidator.predicate(
    "total reviews is non-negative",
    product.rating.totalReviews >= 0,
  );
  if (product.rating.averageRating !== null) {
    TestValidator.predicate(
      "average rating is between 1 and 5",
      product.rating.averageRating >= 1 && product.rating.averageRating <= 5,
    );
  }
}
