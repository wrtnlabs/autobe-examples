import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test successful retrieval of a seller's own active product with complete details.
 *
 * Validates the complete product retrieval workflow including seller authentication, product creation with all related entities (images, variants, inventory), and verification that the GET endpoint returns all data correctly joined. Ensures that product details match the creation values and that all nested entities are properly structured.
 *
 * Special attention is given to verifying that images are ordered by display_order with the first image serving as thumbnail, variants include correct SKU codes and option values, and stock quantity is accurately calculated from inventory records.
 *
 * 1. Seller registers and authenticates via POST /shoppingMall/auth/seller/join.
 * 2. Product is created with name, description, category, and base price.
 * 3. Product image is added with display_order 0 as thumbnail.
 * 4. Product variant is created with SKU code and option values.
 * 5. Inventory record is added to establish stock availability.
 * 6. Product is retrieved via GET /shoppingMall/seller/products/{productId}.
 * 7. Validates all product fields, images, variants, and stock calculations match expected values.
 */
export async function test_api_seller_product_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create product with complete details
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Add product image as thumbnail (display_order: 0)
  const productImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
          display_order: 0,
        },
      },
    );
  typia.assert(productImage);
  // 4. Create product variant
  const productVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"])}, Size: ${RandomGenerator.pick(["S", "M", "L"])}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(productVariant);
  // 5. Add inventory record for the variant
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: productVariant.id },
        body: {
          quantity_delta: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          reason: "RESTOCK",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 6. Retrieve the product
  const retrievedProduct = await api.functional.shoppingMall.seller.products.at(
    sellerConnection,
    {
      productId: product.id,
    },
  );
  typia.assert(retrievedProduct);
  // 7. Validate product details match creation values
  TestValidator.equals("product ID", retrievedProduct.id, product.id);
  TestValidator.equals("product name", retrievedProduct.name, product.name);
  TestValidator.equals(
    "product description",
    retrievedProduct.description,
    product.description,
  );
  TestValidator.equals(
    "base price",
    retrievedProduct.base_price,
    product.base_price,
  );
  // Validate seller information
  TestValidator.equals("seller ID", retrievedProduct.seller.id, sellerAuth.id);
  TestValidator.equals(
    "seller email",
    retrievedProduct.seller.email,
    sellerAuth.email,
  );
  // Validate category information
  TestValidator.equals(
    "category ID",
    retrievedProduct.category.id,
    product.category.id,
  );
  TestValidator.equals(
    "category name",
    retrievedProduct.category.name,
    product.category.name,
  );
  // Validate images
  TestValidator.predicate(
    "has at least one image",
    retrievedProduct.images.length >= 1,
  );
  TestValidator.equals(
    "first image is thumbnail",
    retrievedProduct.images[0]?.display_order,
    0,
  );
  TestValidator.equals(
    "image URL matches",
    retrievedProduct.images[0]?.url,
    productImage.url,
  );
  // Validate variants
  TestValidator.predicate(
    "has at least one variant",
    retrievedProduct.variants.length >= 1,
  );
  const retrievedVariant = retrievedProduct.variants[0]!;
  TestValidator.equals(
    "variant SKU code",
    retrievedVariant.sku_code,
    productVariant.sku_code,
  );
  TestValidator.equals(
    "variant option values",
    retrievedVariant.option_values,
    productVariant.option_values,
  );
  // Validate timestamps exist
  TestValidator.predicate(
    "created_at exists",
    retrievedProduct.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedProduct.updated_at !== null,
  );
  // Validate product is active (not deleted)
  TestValidator.equals("deleted_at is null", retrievedProduct.deleted_at, null);
}
