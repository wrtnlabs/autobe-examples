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
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_seller_variants_options_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_options_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test retrieving a product variant option value by its ID.
 *
 * 1. Admin creates a category
 * 2. Seller registers and creates a product in that category
 * 3. Seller creates a product variant with SKU code and option values
 * 4. Seller creates an option for the variant (e.g., Color: Red)
 * 5. Retrieve the option by its ID with the variant ID path parameter
 * 6. Verify the response contains correct optionName, optionValue, timestamps, and productVariantId matches the variant
 */
export async function test_api_variant_option_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {},
  });
  // Create seller connection for product and variant management
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // 1. Admin creates a category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        parentId: null,
      },
    },
  );
  typia.assert(category);
  // 2. Seller creates a product in the category
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Seller creates a product variant with SKU code and option values
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          options: [
            {
              optionName: "Color",
              optionValue: "Red",
            },
            {
              optionName: "Size",
              optionValue: "Large",
            },
          ],
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 4. Seller creates an option for the variant
  const option =
    await generate_random_ecommerce_mall_seller_variants_options_create(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          optionName: "Material",
          optionValue: "Cotton",
        },
      },
    );
  typia.assert(option);
  // 5. Retrieve the option by its ID with the variant ID path parameter
  const retrievedOption =
    await api.functional.ecommerceMall.variants.options.at(connection, {
      variantId: variant.id,
      optionId: option.id,
    });
  typia.assert(retrievedOption);
  // 6. Verify the response contains correct optionName, optionValue, timestamps, and productVariantId matches the variant
  TestValidator.equals(
    "optionName matches",
    retrievedOption.optionName,
    option.optionName,
  );
  TestValidator.equals(
    "optionValue matches",
    retrievedOption.optionValue,
    option.optionValue,
  );
  TestValidator.equals(
    "productVariantId matches the variant",
    retrievedOption.productVariantId,
    variant.id,
  );
  TestValidator.predicate("createdAt exists", !!retrievedOption.createdAt);
  TestValidator.predicate("updatedAt exists", !!retrievedOption.updatedAt);
}
