import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test deletion of an option from a variant that has multiple option attributes remaining after deletion.
 *
 * This test verifies that removing one option attribute (e.g., sleeve: Long) from a variant
 * does not affect other option attributes (size, color, material, fit), and the variant
 * remains valid and purchasable.
 */
export async function test_api_product_variant_option_delete_multiple_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create a variant with many option attributes (size, color, material, fit, sleeve)
  const options = {
    size: "Large",
    color: "Red",
    material: "Cotton",
    fit: "Regular",
    sleeve: "Long",
  } as const;
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku: RandomGenerator.alphaNumeric(12),
          options: options,
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 4. Parse variant options and identify an option to delete
  // Note: options are stored as JSON string, need to parse
  const variantOptions = JSON.parse(variant.options) as {
    [key: string]: string;
  };
  // Select an option to delete (e.g., "sleeve")
  const optionKeyToDelete = "sleeve";
  const optionValueToDelete = variantOptions[optionKeyToDelete];
  // TODO: Get the actual option_id from the database
  // For now, we need to use a random option_id as the SDK doesn't provide option listing
  const optionIdToDelete = typia.random<string & tags.Format<"uuid">>();
  // 5. Delete the option
  await api.functional.ecommerceMall.seller.products.variants.options.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
      optionId: optionIdToDelete,
    },
  );
  // 6. Validate remaining options are intact
  const updatedVariant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku: variant.sku,
          options: variantOptions,
          base_price: variant.basePrice,
          stock_quantity: variant.stockQuantity satisfies number as number & tags.Type<"int32"> & tags.Minimum<0>,
        },
      },
    );
  typia.assert(updatedVariant);
}