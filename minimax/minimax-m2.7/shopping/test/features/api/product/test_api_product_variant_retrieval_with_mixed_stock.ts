import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_product_variant_retrieval_with_mixed_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 2. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create in-stock variant with price override (SKU: VAR-IN-STOCK-001, color: Red, size: Large)
  const variantInStock1 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "VAR-IN-STOCK-001",
          price: 49.99,
          quantity: 100,
          option_values: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
      },
    );
  typia.assert(variantInStock1);
  // 4. Create out-of-stock variant (SKU: VAR-OUT-STOCK-002, color: Blue, size: Medium)
  const variantOutOfStock =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "VAR-OUT-STOCK-002",
          quantity: 0,
          option_values: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Medium" },
          ],
        },
      },
    );
  typia.assert(variantOutOfStock);
  // 5. Create third in-stock variant without price override (SKU: VAR-IN-STOCK-003, color: Green, size: Small)
  const variantInStock2 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "VAR-IN-STOCK-003",
          quantity: 50,
          option_values: [
            { key: "color", value: "Green" },
            { key: "size", value: "Small" },
          ],
        },
      },
    );
  typia.assert(variantInStock2);
  // 6. Retrieve variants as customer/guest
  const guestConnection: api.IConnection = { host: connection.host };
  const variant = await api.functional.ecommerceMall.products.variants.list(
    guestConnection,
    { productId: product.id },
  );
  typia.assert(variant);
  // 7. Validate variant is not deleted
  TestValidator.equals("variant deleted_at is null", variant.deleted_at, null);
  // 8. Verify optionValues exist and have correct structure
  TestValidator.predicate(
    "variant has optionValues array",
    Array.isArray(variant.optionValues) && variant.optionValues.length > 0,
  );
  // 9. Validate variant quantity is valid (>= 0)
  TestValidator.predicate(
    "variant quantity is non-negative",
    variant.quantity >= 0,
  );
  // 10. Verify price override behavior
  // If variant has no price override, price should be null (base price applies)
  TestValidator.equals(
    "variant without price override returns null",
    variant.price,
    null,
  );
  // 11. Verify variant has valid SKU code
  TestValidator.predicate(
    "variant has valid sku_code",
    typeof variant.sku_code === "string" && variant.sku_code.length > 0,
  );
  // 12. Verify variant has valid timestamps
  TestValidator.predicate(
    "variant has valid created_at",
    typeof variant.created_at === "string" && variant.created_at.length > 0,
  );
  TestValidator.predicate(
    "variant has valid updated_at",
    typeof variant.updated_at === "string" && variant.updated_at.length > 0,
  );
}
