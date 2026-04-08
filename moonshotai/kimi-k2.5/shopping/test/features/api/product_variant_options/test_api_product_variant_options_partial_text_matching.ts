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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantOption";
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
import { generate_random_ecommerce_mall_seller_products_variants_options_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_options_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test partial text matching filters on option name and option value.
 *
 * 1. Admin creates category
 * 2. Seller creates product, variant, and three options (Color='Dark Red', Size='Extra Large', Material='Organic Cotton')
 * 3. Test partial matching: optionName='Col' returns Color option
 * 4. Test partial matching: optionValue='Red' returns Dark Red option
 * 5. Test combined filter: optionName='Size' AND optionValue='Large' returns Extra Large option
 * 6. Verify case-insensitive ILIKE behavior
 * 7. Test edge case: no matches returns empty data with records=0
 */
export async function test_api_product_variant_options_partial_text_matching(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin actor setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin123!",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      ip: null,
    },
  });
  // 2. Create category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Test Category",
        description: "Test category for product variant options",
      },
    },
  );
  typia.assert(category);
  // 3. Seller actor setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller123!",
      href: "https://example.com/seller",
      referrer: "https://example.com",
      ip: null,
    },
  });
  // 4. Create product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product",
        description: "A test product for variant option filtering",
        categoryId: category.id,
        basePrice: 100,
      },
    },
  );
  typia.assert(product);
  // 5. Create variant as seller (with options directly during creation)
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "TEST-SKU-001",
          price: 150,
          options: [
            { optionName: "Color", optionValue: "Dark Red" },
            { optionName: "Size", optionValue: "Extra Large" },
            { optionName: "Material", optionValue: "Organic Cotton" },
          ],
        },
      },
    );
  typia.assert(variant);
  // 6. Test partial text matching by option name - 'Col' should match 'Color'
  const searchByNameResult: IPageIEcommerceMallProductVariantOption.ISummary =
    await api.functional.ecommerceMall.products.variants.options.index(
      connection,
      {
        productId: product.id,
        productVariantId: variant.id,
        body: {
          optionName: "Col",
        } satisfies IEcommerceMallProductVariantOption.IRequest,
      },
    );
  typia.assert(searchByNameResult);
  TestValidator.equals(
    "optionName 'Col' returns 1 record",
    searchByNameResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "optionName 'Col' returns Color option",
    searchByNameResult.data[0]?.optionName,
    "Color",
  );
  // 7. Test partial text matching by option value - 'Red' should match 'Dark Red'
  const searchByValueResult: IPageIEcommerceMallProductVariantOption.ISummary =
    await api.functional.ecommerceMall.products.variants.options.index(
      connection,
      {
        productId: product.id,
        productVariantId: variant.id,
        body: {
          optionValue: "Red",
        } satisfies IEcommerceMallProductVariantOption.IRequest,
      },
    );
  typia.assert(searchByValueResult);
  TestValidator.equals(
    "optionValue 'Red' returns 1 record",
    searchByValueResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "optionValue 'Red' returns Dark Red option",
    searchByValueResult.data[0]?.optionValue,
    "Dark Red",
  );
  // 8. Test combined filter - optionName='Size' AND optionValue='Large'
  const combinedSearchResult: IPageIEcommerceMallProductVariantOption.ISummary =
    await api.functional.ecommerceMall.products.variants.options.index(
      connection,
      {
        productId: product.id,
        productVariantId: variant.id,
        body: {
          optionName: "Size",
          optionValue: "Large",
        } satisfies IEcommerceMallProductVariantOption.IRequest,
      },
    );
  typia.assert(combinedSearchResult);
  TestValidator.equals(
    "combined filter returns 1 record",
    combinedSearchResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "combined filter returns Size/Extra Large",
    combinedSearchResult.data[0]?.optionName,
    "Size",
  );
  TestValidator.equals(
    "combined filter returns Extra Large value",
    combinedSearchResult.data[0]?.optionValue,
    "Extra Large",
  );
  // 9. Test case-insensitivity with uppercase
  const caseInsensitiveResult: IPageIEcommerceMallProductVariantOption.ISummary =
    await api.functional.ecommerceMall.products.variants.options.index(
      connection,
      {
        productId: product.id,
        productVariantId: variant.id,
        body: {
          optionName: "MATERIAL",
        } satisfies IEcommerceMallProductVariantOption.IRequest,
      },
    );
  typia.assert(caseInsensitiveResult);
  TestValidator.equals(
    "uppercase optionName 'MATERIAL' returns 1 record",
    caseInsensitiveResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "uppercase search returns Material option",
    caseInsensitiveResult.data[0]?.optionName,
    "Material",
  );
  // 10. Test case-insensitivity with mixed case
  const mixedCaseResult: IPageIEcommerceMallProductVariantOption.ISummary =
    await api.functional.ecommerceMall.products.variants.options.index(
      connection,
      {
        productId: product.id,
        productVariantId: variant.id,
        body: {
          optionValue: "oRgAnIc",
        } satisfies IEcommerceMallProductVariantOption.IRequest,
      },
    );
  typia.assert(mixedCaseResult);
  TestValidator.equals(
    "mixed case optionValue 'oRgAnIc' returns 1 record",
    mixedCaseResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "mixed case search returns Organic Cotton",
    mixedCaseResult.data[0]?.optionValue,
    "Organic Cotton",
  );
  // 11. Test no match edge case - empty result with records=0
  const noMatchResult: IPageIEcommerceMallProductVariantOption.ISummary =
    await api.functional.ecommerceMall.products.variants.options.index(
      connection,
      {
        productId: product.id,
        productVariantId: variant.id,
        body: {
          optionName: "NonExistent",
        } satisfies IEcommerceMallProductVariantOption.IRequest,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "non-existent optionName returns 0 records",
    noMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent optionName returns empty data array",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent optionName pagination current is 1",
    noMatchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "non-existent optionName pagination pages is 0",
    noMatchResult.pagination.pages,
    0,
  );
}
