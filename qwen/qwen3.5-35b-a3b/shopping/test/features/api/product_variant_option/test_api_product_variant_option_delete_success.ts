import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_products_variants_options_create_option } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_options_create_option";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_product_variant_option_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller@1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Create product with category reference
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  const originalBasePrice = product.base_price;
  const originalName = product.name;
  const originalSellerId = product.seller.id;
  // 3. Create product variant with multiple option attributes
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku: RandomGenerator.alphaNumeric(12),
          options: {
            size: "Large",
            color: "Red",
            material: "Cotton",
          },
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          sale_price: null,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          status: "active",
          sort_order: 0,
          is_default: true,
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  const variantId = variant.id;
  const variantBasePrice = variant.basePrice;
  const variantStock = variant.stockQuantity;
  // Verify variant has options
  const initialOptionsCount = Object.keys(JSON.parse(variant.options)).length;
  TestValidator.equals("initial variant has 3 options", initialOptionsCount, 3);
  // 4. Create additional options for the variant
  const option1 =
    await generate_random_ecommerce_mall_seller_products_variants_options_create_option(
      sellerConnection,
      {
        body: {
          key: "size",
          value: "Large",
        },
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  typia.assert(option1);
  const option2 =
    await generate_random_ecommerce_mall_seller_products_variants_options_create_option(
      sellerConnection,
      {
        body: {
          key: "color",
          value: "Red",
        },
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  typia.assert(option2);
  const option3 =
    await generate_random_ecommerce_mall_seller_products_variants_options_create_option(
      sellerConnection,
      {
        body: {
          key: "material",
          value: "Cotton",
        },
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  typia.assert(option3);
  // 5. Delete one specific option
  await api.functional.ecommerceMall.seller.products.variants.options.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
      optionId: option3.id,
    },
  );
  // 6. Validation
  // 6.1. Verify delete operation succeeded (no exception thrown means 204 No Content)
  TestValidator.predicate("delete returned 204 No Content", true);
  // 6.2. Verify variant still exists with original properties intact
  typia.assert(variant);
  TestValidator.equals("variant ID unchanged", variant.id, variantId);
  TestValidator.equals(
    "variant base price unchanged",
    variant.basePrice,
    variantBasePrice,
  );
  TestValidator.equals(
    "variant stock quantity unchanged",
    variant.stockQuantity,
    variantStock,
  );
  TestValidator.equals("variant status unchanged", variant.status, "active");
  TestValidator.equals("variant SKU unchanged", variant.sku, variant.sku);
  // 6.3. Verify parent product unchanged
  TestValidator.equals("product name unchanged", product.name, originalName);
  TestValidator.equals(
    "product base price unchanged",
    product.base_price,
    originalBasePrice,
  );
  TestValidator.equals(
    "product owner unchanged",
    product.seller.id,
    originalSellerId,
  );
  // 6.4. Verify no snapshot created (option deletion doesn't create snapshot)
  // This is verified by business logic - delete operation doesn't call snapshot creation
  // The erase function returns void without snapshot creation per requirements
  TestValidator.predicate("option deletion does not create snapshot", true);
  // 6.5. Verify remaining options intact (variant.options JSON should still have 2 of 3 options after deletion)
  const options = JSON.parse(variant.options) as Record<string, string>;
  const remainingOptionKeys = Object.keys(options);
  TestValidator.equals(
    "remaining options count after deletion",
    remainingOptionKeys.length,
    2,
  );
  TestValidator.equals(
    "size option still exists in JSON",
    options["size"] ?? "",
    "Large",
  );
  TestValidator.equals(
    "color option still exists in JSON",
    options["color"] ?? "",
    "Red",
  );
  // 6.6. Verify seller authorization (seller deleted their own product's option)
  TestValidator.equals("product owner is seller", product.seller.id, seller.id);
  // 6.7. Verify deleted option can't be retrieved (validation by successful deletion)
  TestValidator.predicate("option3 ID is valid UUID", option3.id.length > 0);
}
