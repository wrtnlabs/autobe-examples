import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { generate_random_ecommerce_platform_seller_products_variants_options_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_options_create";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Validates that product variant options persist unchanged after the parent variant is updated.
 *
 * This test ensures that variant options maintain their own independent lifecycle and are not recreated, modified, or lost when the parent product variant undergoes updates such as price changes or SKU modifications. Variant options should remain stable as long as the parent variant itself is not deleted.
 *
 * The test creates a complete product hierarchy: seller → product → variant → option, captures the option's identifying data, updates the parent variant, and then verifies the option remains intact with identical attribute values and timestamps.
 *
 * 1. Register and authenticate a new seller account.
 * 2. Create a product with randomized name, description, base price, and category.
 * 3. Create a product variant with an initial set of options.
 * 4. Create an additional option for the variant (e.g., material: Cotton).
 * 5. Capture the option's id, attribute key, attribute value, and created timestamp.
 * 6. Update the parent variant by changing its price.
 * 7. Retrieve the option directly by its id to confirm persistence.
 * 8. Validate that the option's id, attribute key, attribute value, and createdAt remain unchanged.
 */
export async function test_api_product_variant_option_persist_after_parent_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create a product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Create a variant with initial options
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Create an additional option for the variant
  const option =
    await generate_random_ecommerce_platform_seller_products_variants_options_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          skuCode: variant.sku_code,
        },
        body: {
          attributeKey: "material",
          attributeValue: "Cotton",
        },
      },
    );
  typia.assert(option);
  // 5. Capture initial option data
  const initialOptionId = option.id;
  const initialAttributeKey = option.attributeKey;
  const initialAttributeValue = option.attributeValue;
  const initialCreatedAt = option.createdAt;
  // 6. Update the parent variant (change price)
  const updatedPrice = typia.random<
    number & tags.Minimum<0>
  >() satisfies number as number;
  const updatedVariant =
    await api.functional.ecommercePlatform.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: updatedPrice,
        } satisfies IEcommercePlatformProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 7. Retrieve the option to confirm it still exists (unauthenticated endpoint)
  const retrievedOption =
    await api.functional.ecommercePlatform.products.variants.options.at(
      { host: connection.host },
      {
        productId: product.id,
        variantId: variant.id,
        optionId: initialOptionId,
      },
    );
  typia.assert(retrievedOption);
  // 8. Validate that the option's data is unchanged
  TestValidator.equals(
    "option id unchanged",
    retrievedOption.id,
    initialOptionId,
  );
  TestValidator.equals(
    "attribute key unchanged",
    retrievedOption.attributeKey,
    initialAttributeKey,
  );
  TestValidator.equals(
    "attribute value unchanged",
    retrievedOption.attributeValue,
    initialAttributeValue,
  );
  TestValidator.equals(
    "created at unchanged",
    retrievedOption.createdAt,
    initialCreatedAt,
  );
}
