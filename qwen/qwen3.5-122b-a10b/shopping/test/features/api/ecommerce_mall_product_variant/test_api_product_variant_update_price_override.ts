import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test updating product variant price override functionality.
 *
 * This test validates that sellers can modify the price field of a product variant
 * to override the product's base price. The test covers:
 * 1. Updating price to a new positive value
 * 2. Setting price to null to revert to product base price
 * 3. Business logic validation (price = 0 should be rejected)
 * 4. Response validation with typia.assert()
 * 5. Verification that price changes are reflected correctly
 *
 * Multi-actor setup:
 * - Admin: Create category (required for product creation)
 * - Seller: Create product, create variant, update variant price
 */
export async function test_api_product_variant_update_price_override(
  connection: api.IConnection,
): Promise<void> {
  // ==================== ADMIN SETUP ====================
  // Generate admin credentials
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  // Create admin account for category creation
  const adminJoinResult: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IEcommerceMallAdmin.IJoin,
    });
  typia.assert(adminJoinResult);
  // Create admin connection and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Create category required for product creation
  const category: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // ==================== SELLER SETUP ====================
  // Generate seller credentials
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = RandomGenerator.alphaNumeric(16);
  // Create seller account
  const sellerJoinResult: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        shop_name: RandomGenerator.name(2),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
  typia.assert(sellerJoinResult);
  // Create seller connection and login
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // Create product owned by seller
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          category_id: category.id,
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // Create initial variant with price override
  const initialPrice: number = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<100>
  >();
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [
            { key: "color", value: RandomGenerator.name(1) },
          ] satisfies IEcommerceMallProductVariantOption[],
          price: initialPrice,
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Verify initial price is set
  TestValidator.equals(
    "initial price override set",
    variant.price,
    initialPrice,
  );
  // ==================== TEST 1: Update price to new positive value ====================
  const newPrice: number = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<500>
  >();
  const updatedVariant1: IEcommerceMallProductVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: newPrice,
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant1);
  // Validate price was updated
  TestValidator.equals(
    "price updated to new value",
    updatedVariant1.price,
    newPrice,
  );
  // ==================== TEST 2: Set price to null to revert to base price ====================
  const updatedVariant2: IEcommerceMallProductVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: null,
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant2);
  // Validate price is now null (reverted to base price)
  TestValidator.equals("price reverted to null", updatedVariant2.price, null);
  // ==================== TEST 3: Validate price = 0 is rejected (business logic error) ====================
  // Note: This is a business logic error, not a type error. We use valid types but invalid business value.
  await TestValidator.error("price = 0 should be rejected", async () => {
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: 0,
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  });
  // ==================== TEST 4: Verify stock quantity cannot be modified through this endpoint ====================
  // The variant update endpoint should not allow stock quantity modification
  // This is managed through inventory management APIs
  const originalStockQuantity: number = updatedVariant2.stockQuantity;
  const updatedVariant3: IEcommerceMallProductVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: newPrice,
          // Note: stockQuantity is not in IUpdate type, so we cannot modify it here
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant3);
  // Stock quantity should remain unchanged
  TestValidator.equals(
    "stock quantity unchanged",
    updatedVariant3.stockQuantity,
    originalStockQuantity,
  );
  // ==================== TEST 5: Final price update for completeness ====================
  const finalPrice: number = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const finalVariant: IEcommerceMallProductVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: finalPrice,
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(finalVariant);
  TestValidator.equals(
    "final price update successful",
    finalVariant.price,
    finalPrice,
  );
}
