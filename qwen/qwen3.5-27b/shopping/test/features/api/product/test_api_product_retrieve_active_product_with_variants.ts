import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller can retrieve complete details of their own active product including all product attributes, images sorted by display order, variants with SKU codes and option values, current inventory counts for each variant, seller profile information, category details, and review statistics.
 *
 * This test validates the product retrieval endpoint by authenticating as a seller and fetching a product's complete information. It ensures that the response contains all expected fields including product core attributes, images sorted by display order, variants with their options and inventory status, seller profile, category information, and review statistics.
 *
 * Special attention is given to verifying that:
 * - Images are sorted by display_order in ascending order
 * - Variants contain SKU codes, prices, option key-value pairs, and inventory counts
 * - Seller profile information is properly joined and includes shop details
 * - Category information is present or null if uncategorized
 * - The product is active (deleted_at is null)
 *
 * 1. Register and authenticate as a seller using authorize_seller_join utility
 * 2. Generate a valid product UUID for retrieval
 * 3. Call the product retrieval endpoint with the product ID
 * 4. Validate the complete response structure using typia.assert()
 * 5. Verify business logic constraints on images, variants, and product status
 */
export async function test_api_product_retrieve_active_product_with_variants(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // 2. Generate a valid product UUID for retrieval
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call the product retrieval endpoint
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.at(sellerConnection, {
      productId,
    });
  // 4. Validate the complete response structure using typia.assert()
  typia.assert(product);
  // 5. Verify business logic constraints
  // Verify product is active (deleted_at is null)
  TestValidator.equals("product should be active", product.deleted_at, null);
  // Verify product has required fields
  TestValidator.predicate("product has valid name", product.name.length > 0);
  TestValidator.predicate(
    "product has valid description",
    product.description.length > 0,
  );
  TestValidator.predicate(
    "product has positive base price",
    product.base_price > 0,
  );
  // Verify images are sorted by display_order ascending
  if (product.images.length > 1) {
    for (let i = 1; i < product.images.length; i++) {
      TestValidator.predicate(
        `image ${i} display_order should be >= image ${i - 1} display_order`,
        product.images[i].display_order >= product.images[i - 1].display_order,
      );
    }
  }
  // Verify each image has required fields
  await ArrayUtil.asyncForEach(product.images, async (image) => {
    typia.assert(image);
    TestValidator.predicate("image has valid URI", image.image_uri.length > 0);
    TestValidator.predicate(
      "image display_order is positive",
      image.display_order >= 1,
    );
  });
  // Verify variants contain required fields
  await ArrayUtil.asyncForEach(product.variants, async (variant) => {
    typia.assert(variant);
    // Verify variant is active (deleted_at is null)
    TestValidator.equals("variant should be active", variant.deleted_at, null);
    // Verify variant has SKU code
    TestValidator.predicate(
      "variant has valid SKU code",
      variant.sku_code.length > 0,
    );
    // Verify variant has non-negative inventory count
    TestValidator.predicate(
      "variant has non-negative inventory count",
      variant.inventory_count >= 0,
    );
    // Verify variant options
    await ArrayUtil.asyncForEach(variant.options, async (option) => {
      typia.assert(option);
      TestValidator.predicate("option has valid key", option.key.length > 0);
      TestValidator.predicate(
        "option has valid value",
        option.value.length > 0,
      );
    });
  });
  // Verify seller profile information
  typia.assert(product.seller);
  TestValidator.predicate(
    "seller has valid shop name",
    product.seller.seller_profile.shop_name.length > 0,
  );
  TestValidator.predicate(
    "seller has valid shop description",
    product.seller.seller_profile.shop_description.length > 0,
  );
  TestValidator.predicate(
    "seller has valid approval status",
    ["pending", "approved", "rejected"].includes(
      product.seller.approval_status,
    ),
  );
  // Verify category information (can be null if uncategorized)
  if (product.category !== null) {
    typia.assert(product.category);
    TestValidator.predicate(
      "category has valid name",
      product.category.name.length > 0,
    );
    TestValidator.predicate(
      "category has valid description",
      product.category.description.length > 0,
    );
  }
  // Verify reviews_count is non-negative
  TestValidator.predicate(
    "reviews_count is non-negative",
    product.reviews_count >= 0,
  );
  // Verify timestamps are present
  TestValidator.predicate(
    "product has created_at timestamp",
    product.created_at.length > 0,
  );
  TestValidator.predicate(
    "product has updated_at timestamp",
    product.updated_at.length > 0,
  );
}
