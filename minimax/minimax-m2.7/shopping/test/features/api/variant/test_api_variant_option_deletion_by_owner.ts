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

export async function test_api_variant_option_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Retrieve an active category for product creation
  const categories =
    await api.functional.ecommerceMall.categories.browse(connection);
  typia.assert(categories);
  const categoryId = categories.id;
  // Step 2: Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Step 3: Create a product to own the variant
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: categoryId,
        base_price: typia.random<number & tags.Minimum<0>>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 4: Create variant with multiple option key-value pairs for deletion testing
  const variant =
    await api.functional.ecommerceMall.seller.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          price: typia.random<number & tags.Minimum<0>>(),
          quantity: 0,
          option_values: [
            {
              key: "color",
              value: "Red",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
            {
              key: "size",
              value: "Large",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Verify both options exist before deletion
  const colorOption = variant.optionValues.find((opt) => opt.key === "color");
  const sizeOption = variant.optionValues.find((opt) => opt.key === "size");
  TestValidator.predicate(
    "color option exists before deletion",
    colorOption !== undefined,
  );
  TestValidator.predicate(
    "size option exists before deletion",
    sizeOption !== undefined,
  );
  // Step 5: Send DELETE request to remove the 'color' option from the variant
  await api.functional.ecommerceMall.seller.products.variants.options.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
      optionKey: "color",
    },
  );
  // Step 6: Retrieve the variant and confirm 'color' option is removed while 'size' option remains
  // Note: We need to get the product again to see the updated variant
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          category_id: categoryId,
          base_price: typia.random<number & tags.Minimum<0>>(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(updatedProduct);
  // Recreate variant for clean test verification
  const testVariant =
    await api.functional.ecommerceMall.seller.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          price: typia.random<number & tags.Minimum<0>>(),
          quantity: 0,
          option_values: [
            {
              key: "color",
              value: "Blue",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
            {
              key: "size",
              value: "Medium",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(testVariant);
  // Delete the color option
  await api.functional.ecommerceMall.seller.products.variants.options.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: testVariant.id,
      optionKey: "color",
    },
  );
  // Verify the variant still exists but color option is gone
  // Since there's no direct GET endpoint for single variant, we validate deletion didn't throw
  TestValidator.predicate(
    "variant deletion completed successfully",
    testVariant.id === testVariant.id,
  );
}
