import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test the primary success path for a seller updating their product variant.
 * The seller should be able to modify the SKU code, update the variant-specific
 * price override, and completely replace the option values.
 */
export async function test_api_product_variant_update_success_with_snapshot_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  // Step 2: Create category as admin
  const category: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<1>>(),
        },
      },
    );
  typia.assert(category);
  // Step 3: Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // Step 4: Create product under the category
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
          basePrice: 100,
        },
      },
    );
  typia.assert(product);
  // Step 5: Create initial variant with SKU, price, and options
  const initialOptions: IEcommerceMallProductVariantOption.ICreate[] = [
    { optionName: "Color", optionValue: "Red" },
    { optionName: "Size", optionValue: "Small" },
  ];
  const createdVariant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "initial-sku-123",
          price: 100,
          options: initialOptions,
        },
      },
    );
  typia.assert(createdVariant);
  // Record original values for comparison
  const originalSkuCode = createdVariant.skuCode;
  const originalPrice = createdVariant.price;
  const originalOptions = [...createdVariant.variantOptions];
  const createdAt = createdVariant.createdAt;
  // Step 6: Update the variant with completely new values
  const newOptions: IEcommerceMallProductVariantOption.ICreate[] = [
    { optionName: "Color", optionValue: "Blue" },
    { optionName: "Size", optionValue: "Large" },
  ];
  const updateBody: IEcommerceMallProductVariant.IUpdate = {
    skuCode: "updated-sku-456",
    price: 150,
    options: newOptions,
  } satisfies IEcommerceMallProductVariant.IUpdate;
  const updatedVariant: IEcommerceMallProductVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        productVariantId: createdVariant.id,
        body: updateBody,
      },
    );
  typia.assert(updatedVariant);
  // Step 7: Validations
  // Validate updated SKU code
  TestValidator.equals(
    "updated variant should have new SKU code",
    updatedVariant.skuCode,
    "updated-sku-456",
  );
  // Validate updated price
  TestValidator.equals(
    "updated variant should have new price",
    updatedVariant.price,
    150,
  );
  // Validate SDK warned that original SKU is different from updated
  TestValidator.notEquals(
    "SKU should be different after update",
    originalSkuCode,
    updatedVariant.skuCode,
  );
  // Validate SDK warned that original price is different from updated
  TestValidator.notEquals(
    "price should be different after update",
    originalPrice,
    updatedVariant.price,
  );
  // Validate new option values
  TestValidator.equals(
    "updated variant should have Color=Blue option",
    updatedVariant.variantOptions.some(
      (opt) => opt.optionName === "Color" && opt.optionValue === "Blue",
    ),
    true,
  );
  TestValidator.equals(
    "updated variant should have Size=Large option",
    updatedVariant.variantOptions.some(
      (opt) => opt.optionName === "Size" && opt.optionValue === "Large",
    ),
    true,
  );
  // Validate old option values are gone
  TestValidator.equals(
    "updated variant should NOT have Color=Red option",
    updatedVariant.variantOptions.some(
      (opt) => opt.optionName === "Color" && opt.optionValue === "Red",
    ),
    false,
  );
  TestValidator.equals(
    "updated variant should NOT have Size=Small option",
    updatedVariant.variantOptions.some(
      (opt) => opt.optionName === "Size" && opt.optionValue === "Small",
    ),
    false,
  );
  // Validate inventory quantity is present (calculated field)
  TestValidator.predicate(
    "updated variant should have inventoryQuantity as number",
    typeof updatedVariant.inventoryQuantity === "number",
  );
  // Step 8: Validate updatedAt is newer than createdAt
  TestValidator.predicate(
    "updatedAt should be newer than createdAt",
    new Date(updatedVariant.updatedAt).getTime() >
      new Date(createdAt).getTime(),
  );
}
