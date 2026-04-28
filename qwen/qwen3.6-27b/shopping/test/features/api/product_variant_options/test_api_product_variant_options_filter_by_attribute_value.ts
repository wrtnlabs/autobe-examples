import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformProductVariantOption";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Filter product variant options by specific attribute values to verify IN clause filtering.
 *
 * Validates the attribute_values filtering capability on the product variant options endpoint.
 * Creates a product variant with multiple option types (color, size, material) and applies
 * an attribute_values filter to retrieve only options matching the specified values.
 *
 * 1. Administrator registers an account for platform management.
 * 2. Administrator logs in to gain administrative privileges.
 * 3. Administrator creates a product category for product classification.
 * 4. Seller registers an account to create products.
 * 5. Seller logs in to authenticate for product operations.
 * 6. Seller creates a product in the assigned category.
 * 7. Seller creates a product variant with multiple options: color (Red), size (Large), and material (Cotton).
 * 8. Platform visitor filters the variant options by attribute_values ['Red', 'Large'].
 * 9. Validates that only the color (Red) and size (Large) options are returned, excluding the material (Cotton) option.
 */
export async function test_api_product_variant_options_filter_by_attribute_value(
  connection: api.IConnection,
) {
  // 1-2. Admin registers and logs in
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  // 3. Admin creates a product category
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(category);
  // 4-5. Seller joins and logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.IJoin,
  });
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 6. Seller creates a product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: typia.random<number & tags.Type<"uint32">>(),
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  // 7. Seller creates a product variant with multiple options
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          options: [
            {
              attributeKey: "color",
              attributeValue: "Red",
            },
            {
              attributeKey: "size",
              attributeValue: "Large",
            },
            {
              attributeKey: "material",
              attributeValue: "Cotton",
            },
          ],
        },
      },
    );
  typia.assert(variant);
  // 8. Filter variant options by attribute_values ['Red', 'Large'] using seller connection
  const response =
    await api.functional.ecommercePlatform.products.variants.options.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          attribute_values: ["Red", "Large"],
        } satisfies IEcommercePlatformProductVariantOption.IRequest,
      },
    );
  typia.assert(response);
  // 9. Validate only the matching options are returned (2 options, not 3)
  TestValidator.equals(
    "total records should be 2",
    response.pagination.records,
    2,
  );
  TestValidator.equals(
    "returned options count should be 2",
    response.data.length,
    2,
  );
  // Validate the returned options are color=Red and size=Large
  const attributeValues = response.data.map((option) => option.attributeValue);
  TestValidator.predicate(
    "should contain Red option",
    attributeValues.includes("Red"),
  );
  TestValidator.predicate(
    "should contain Large option",
    attributeValues.includes("Large"),
  );
  TestValidator.predicate(
    "should not contain Cotton option",
    !attributeValues.includes("Cotton"),
  );
}
