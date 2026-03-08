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

export async function test_api_product_variant_price_override_and_stock_management(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 2. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Create product with base price $50
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: 50,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  TestValidator.equals("base price is $50", product.basePrice, 50);
  // 4. Create PREMIUM variant with price override $75 and stock 5
  const premiumVariant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: "PREMIUM-001",
          optionValues: [
            { key: "material", value: "Premium" },
          ] satisfies IEcommerceMallProductVariantOption[],
          price: 75,
          stockQuantity: 5,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(premiumVariant);
  TestValidator.equals(
    "premium variant price override is $75",
    premiumVariant.price,
    75,
  );
  TestValidator.equals(
    "premium variant stock is 5",
    premiumVariant.stockQuantity,
    5,
  );
  // 5. Create STANDARD variant with no price override (null) and stock 20
  const standardVariant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: "STANDARD-001",
          optionValues: [
            { key: "material", value: "Standard" },
          ] satisfies IEcommerceMallProductVariantOption[],
          price: null,
          stockQuantity: 20,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(standardVariant);
  TestValidator.equals(
    "standard variant price is null (uses base price)",
    standardVariant.price,
    null,
  );
  TestValidator.equals(
    "standard variant stock is 20",
    standardVariant.stockQuantity,
    20,
  );
  // 6. Create variant with zero stock quantity (out of stock)
  const zeroStockVariant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: `OUTOFSTOCK-${typia.random<string & tags.Format<"uuid">>()}`,
          optionValues: [
            { key: "material", value: "Limited" },
          ] satisfies IEcommerceMallProductVariantOption[],
          price: null,
          stockQuantity: 0,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(zeroStockVariant);
  TestValidator.equals(
    "zero stock variant created successfully",
    zeroStockVariant.stockQuantity,
    0,
  );
  TestValidator.equals(
    "zero stock variant price is null",
    zeroStockVariant.price,
    null,
  );
  // 7. Verify all variants have correct SKU codes
  TestValidator.equals(
    "premium variant SKU code",
    premiumVariant.skuCode,
    "PREMIUM-001",
  );
  TestValidator.equals(
    "standard variant SKU code",
    standardVariant.skuCode,
    "STANDARD-001",
  );
  // 8. Verify product remains purchasable (has variants with stock > 0)
  const variantsWithStock = [premiumVariant, standardVariant].filter(
    (v: IEcommerceMallProductVariant) => v.stockQuantity > 0,
  );
  TestValidator.predicate(
    "product has variants with stock > 0",
    variantsWithStock.length > 0,
  );
  TestValidator.equals(
    "product has 2 variants with stock",
    variantsWithStock.length,
    2,
  );
  // 9. Verify price override flexibility - variants can have different prices
  const hasPriceOverride =
    premiumVariant.price !== null && premiumVariant.price !== product.basePrice;
  TestValidator.predicate(
    "premium variant has price override different from base price",
    hasPriceOverride,
  );
  // 10. Verify null price uses base price fallback
  const hasNullPrice = standardVariant.price === null;
  TestValidator.predicate(
    "standard variant has null price (will use base price)",
    hasNullPrice,
  );
}
