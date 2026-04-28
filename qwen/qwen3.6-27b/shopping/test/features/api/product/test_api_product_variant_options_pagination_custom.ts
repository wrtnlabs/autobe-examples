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
 * Test custom pagination and sorting for product variant options.
 *
 * Validates the PATCH endpoint for paginating and sorting variant options when browsing a product with many configuration attributes. The test creates multiple product variants with various option configurations (color, size, material, pattern, weight, style) to ensure sufficient data for pagination testing. Custom pagination parameters (page=1, limit=3) are applied with ascending sort order by attribute_key, returning options alphabetically by their attribute name.
 *
 * Special attention is given to verifying that pagination metadata is correct: current page is 1, limit is 3, records reflect total option count, and pages is calculated as Math.ceil(records/limit). The returned data array should contain up to 3 options sorted alphabetically by attributeKey.
 *
 * 1. Administrator joins and authenticates.
 * 2. Administrator creates a product category.
 * 3. Seller joins and authenticates.
 * 4. Seller creates a product with the category.
 * 5. Seller creates multiple variants with diverse option configurations (at least 5 variants with 1-3 options each).
 * 6. Variant IDs are collected from created variants.
 * 7. First variant options are queried with custom pagination (page=1, limit=3, sort by attribute_key ascending).
 * 8. Validates pagination metadata, data count, and alphabetical sorting order.
 */
export async function test_api_product_variant_options_pagination_custom(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommercePlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminJoinCredentials });
  // 2. Admin creates category
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommercePlatformSeller.IJoin;
  await authorize_seller_join(sellerConnection, {
    body: sellerJoinCredentials,
  });
  // 4. Seller creates product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // 5. Create multiple variants with diverse options
  const variants: IEcommercePlatformProductVariant[] = [];
  const availableKeys = [
    "color",
    "size",
    "material",
    "pattern",
    "weight",
    "style",
    "packaging",
    "season",
  ];
  // Create 8 variants, each with 2-4 unique option keys
  for (let i = 0; i < 8; i++) {
    const numOptions = RandomGenerator.pick([2, 3, 4]);
    // Select unique keys for this variant using sampling
    const selectedKeys = RandomGenerator.sample(availableKeys, numOptions);
    const variant =
      await generate_random_ecommerce_platform_seller_products_variants_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}-${i}`,
            options: selectedKeys.map((key) => ({
              attributeKey: key,
              attributeValue: RandomGenerator.name(),
            })),
          },
        },
      );
    typia.assert(variant);
    variants.push(variant);
  }
  // 6. Use the first variant for pagination test
  const variantId = variants[0].id;
  // 7. Fetch options with custom pagination: page=1, limit=3, sort by attribute_key ASC
  const paginationBody = {
    page: 1,
    limit: 3,
    sort: "attribute_key",
    order: "asc",
  } satisfies IEcommercePlatformProductVariantOption.IRequest;
  const paginatedResult =
    await api.functional.ecommercePlatform.products.variants.options.index(
      sellerConnection,
      {
        productId: product.id,
        variantId,
        body: paginationBody,
      },
    );
  typia.assert(paginatedResult);
  // 8. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals("limit is 3", paginatedResult.pagination.limit, 3);
  TestValidator.predicate(
    "records count is positive",
    paginatedResult.pagination.records > 0,
  );
  const expectedPages = Math.ceil(
    paginatedResult.pagination.records / paginatedResult.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation correct",
    paginatedResult.pagination.pages,
    expectedPages,
  );
  // 9. Validate data count respects limit
  TestValidator.predicate(
    "data length does not exceed limit",
    paginatedResult.data.length <= paginatedResult.pagination.limit,
  );
  TestValidator.predicate(
    "data array has items",
    paginatedResult.data.length > 0,
  );
  // 10. Validate alphabetical sorting by attributeKey ascending
  if (paginatedResult.data.length > 1) {
    for (let i = 1; i < paginatedResult.data.length; i++) {
      TestValidator.predicate(
        `option at index ${i} sorted after index ${i - 1} by attributeKey`,
        paginatedResult.data[i].attributeKey >=
          paginatedResult.data[i - 1].attributeKey,
      );
    }
  }
  // 11. Each returned option references the correct variant
  for (const option of paginatedResult.data) {
    TestValidator.equals(
      "option belongs to correct variant",
      option.variant.id,
      variants[0].id,
    );
  }
}
