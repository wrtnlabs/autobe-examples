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
 * Test listing product variant options with default pagination settings.
 *
 * Validates that all configuration options for a product variant are returned when no filters or pagination parameters are specified. The test creates a variant with three known option key-value pairs (color=Red, size=Large, material=Cotton) and verifies that the paginated response includes all options with correct metadata.
 *
 * Default pagination applies page 1, limit 20, and default sorting by created_at descending when no request body parameters are specified. Soft-deleted options are automatically excluded from results.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers, creates a product, and creates a variant with three option attributes.
 * 3. Lists variant options using the PATCH endpoint with an empty request body.
 * 4. Validates pagination metadata reflects 3 total records across 1 page with limit 20.
 * 5. Validates all three option key-value pairs are present in the response data.
 * 6. Validates each option references the correct parent variant.
 * 7. Validates default sorting by creation timestamp in descending order.
 */
export async function test_api_product_variant_options_list_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication and category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinPassword = typia.random<string & tags.Format<"password">>();
  await authorize_seller_join(sellerConnection, {
    body: { email: sellerJoinEmail, password: sellerJoinPassword },
  });
  // 3. Seller creates a product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // 4. Seller creates a variant with three specific options
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          options: [
            { attributeKey: "color", attributeValue: "Red" },
            { attributeKey: "size", attributeValue: "Large" },
            { attributeKey: "material", attributeValue: "Cotton" },
          ] satisfies IEcommercePlatformProductVariantOption.ICreate[],
        },
      },
    );
  typia.assert(variant);
  // 5. List variant options with default pagination (empty request body)
  const body = {} satisfies IEcommercePlatformProductVariantOption.IRequest;
  const page =
    await api.functional.ecommercePlatform.products.variants.options.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body,
      },
    );
  typia.assert(page);
  // 6. Validate pagination metadata with defaults
  TestValidator.equals("default page number", page.pagination.current, 1);
  TestValidator.equals("default limit", page.pagination.limit, 20);
  TestValidator.equals("total records", page.pagination.records, 3);
  TestValidator.equals("total pages", page.pagination.pages, 1);
  // 7. Validate all three options are returned
  TestValidator.predicate("returned three options", page.data.length === 3);
  // 8. Validate option attribute keys (sorted for order-independent comparison)
  const actualKeys = page.data.map((o) => o.attributeKey).sort();
  TestValidator.equals("option attribute keys match expected set", actualKeys, [
    "color",
    "material",
    "size",
  ]);
  // 9. Validate option attribute values (sorted for order-independent comparison)
  const actualValues = page.data.map((o) => o.attributeValue).sort();
  TestValidator.equals(
    "option attribute values match expected set",
    actualValues,
    ["Cotton", "Large", "Red"],
  );
  // 10. Validate each option references the correct parent variant
  TestValidator.predicate(
    "all options reference correct variant",
    page.data.every((o) => o.variant.id === variant.id),
  );
  // 11. Validate default sorting by created_at descending
  TestValidator.predicate("sorted by created_at desc", () => {
    for (let i = 0; i < page.data.length - 1; i++) {
      if (page.data[i].createdAt < page.data[i + 1].createdAt) {
        return false;
      }
    }
    return true;
  });
}
