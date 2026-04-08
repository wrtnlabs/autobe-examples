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
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_product_variant_options_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup - create product and variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 3. Create variant with 5 options
  const optionDefinitions = [
    { optionName: "Color", optionValue: "Red" },
    { optionName: "Size", optionValue: "Large" },
    { optionName: "Material", optionValue: "Cotton" },
    { optionName: "Style", optionValue: "Casual" },
    { optionName: "Weight", optionValue: "500g" },
  ] satisfies IEcommerceMallProductVariantOption.ICreate[];
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          options: optionDefinitions,
        },
      },
    );
  typia.assert(variant);
  // 4. Test pagination with limit=2
  // Page 1 should return first 2 options
  const page1 =
    await api.functional.ecommerceMall.products.variants.options.index(
      connection,
      {
        productId: product.id,
        productVariantId: variant.id,
        body: {
          limit: 2,
          page: 1,
        } satisfies IEcommerceMallProductVariantOption.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 data count", page1.data.length, 2);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 2);
  TestValidator.equals("page 1 total records", page1.pagination.records, 5);
  TestValidator.equals("page 1 total pages", page1.pagination.pages, 3);
  // Page 2 should return next 2 options
  const page2 =
    await api.functional.ecommerceMall.products.variants.options.index(
      connection,
      {
        productId: product.id,
        productVariantId: variant.id,
        body: {
          limit: 2,
          page: 2,
        } satisfies IEcommerceMallProductVariantOption.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 data count", page2.data.length, 2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 2);
  TestValidator.equals("page 2 total records", page2.pagination.records, 5);
  TestValidator.equals("page 2 total pages", page2.pagination.pages, 3);
  // Page 3 should return remaining 1 option
  const page3 =
    await api.functional.ecommerceMall.products.variants.options.index(
      connection,
      {
        productId: product.id,
        productVariantId: variant.id,
        body: {
          limit: 2,
          page: 3,
        } satisfies IEcommerceMallProductVariantOption.IRequest,
      },
    );
  typia.assert(page3);
  TestValidator.equals("page 3 data count", page3.data.length, 1);
  TestValidator.equals("page 3 current", page3.pagination.current, 3);
  // 5. Test boundary condition - page exceeds available pages
  const pageOutOfBounds =
    await api.functional.ecommerceMall.products.variants.options.index(
      connection,
      {
        productId: product.id,
        productVariantId: variant.id,
        body: {
          limit: 2,
          page: 10,
        } satisfies IEcommerceMallProductVariantOption.IRequest,
      },
    );
  typia.assert(pageOutOfBounds);
  TestValidator.equals(
    "out of bounds data count",
    pageOutOfBounds.data.length,
    0,
  );
  TestValidator.equals(
    "out of bounds current",
    pageOutOfBounds.pagination.current,
    10,
  );
  // 6. Test sorting by optionName ascending (A-Z)
  const sortedByNameAsc =
    await api.functional.ecommerceMall.products.variants.options.index(
      connection,
      {
        productId: product.id,
        productVariantId: variant.id,
        body: {
          sort: "optionName",
          sortOrder: "asc",
          limit: 5,
          page: 1,
        } satisfies IEcommerceMallProductVariantOption.IRequest,
      },
    );
  typia.assert(sortedByNameAsc);
  TestValidator.equals("asc sort count", sortedByNameAsc.data.length, 5);
  // Verify alphabetical order: Color, Material, Size, Style, Weight
  const expectedAscOrder = ["Color", "Material", "Size", "Style", "Weight"];
  for (let i = 0; i < sortedByNameAsc.data.length; i++) {
    TestValidator.equals(
      `asc sort position ${i}`,
      sortedByNameAsc.data[i].optionName,
      expectedAscOrder[i],
    );
  }
  // 7. Test sorting by optionName descending (Z-A)
  const sortedByNameDesc =
    await api.functional.ecommerceMall.products.variants.options.index(
      connection,
      {
        productId: product.id,
        productVariantId: variant.id,
        body: {
          sort: "optionName",
          sortOrder: "desc",
          limit: 5,
          page: 1,
        } satisfies IEcommerceMallProductVariantOption.IRequest,
      },
    );
  typia.assert(sortedByNameDesc);
  TestValidator.equals("desc sort count", sortedByNameDesc.data.length, 5);
  // Verify reverse alphabetical order: Weight, Style, Size, Material, Color
  const expectedDescOrder = ["Weight", "Style", "Size", "Material", "Color"];
  for (let i = 0; i < sortedByNameDesc.data.length; i++) {
    TestValidator.equals(
      `desc sort position ${i}`,
      sortedByNameDesc.data[i].optionName,
      expectedDescOrder[i],
    );
  }
  // 8. Test sorting by createdAt
  const sortedByCreatedAt =
    await api.functional.ecommerceMall.products.variants.options.index(
      connection,
      {
        productId: product.id,
        productVariantId: variant.id,
        body: {
          sort: "createdAt",
          sortOrder: "asc",
          limit: 5,
          page: 1,
        } satisfies IEcommerceMallProductVariantOption.IRequest,
      },
    );
  typia.assert(sortedByCreatedAt);
  TestValidator.equals(
    "createdAt sort count",
    sortedByCreatedAt.data.length,
    5,
  );
  // Verify all option names are present (order depends on creation, just verify presence)
  const optionNames = sortedByCreatedAt.data.map((opt) => opt.optionName);
  TestValidator.predicate(
    "all 5 options present in sorted results",
    optionNames.length === 5 &&
      optionNames.includes("Color") &&
      optionNames.includes("Size") &&
      optionNames.includes("Material") &&
      optionNames.includes("Style") &&
      optionNames.includes("Weight"),
  );
  // 9. Verify pagination metadata consistency across requests
  const allOptions =
    await api.functional.ecommerceMall.products.variants.options.index(
      connection,
      {
        productId: product.id,
        productVariantId: variant.id,
        body: {
          limit: 5,
          page: 1,
        } satisfies IEcommerceMallProductVariantOption.IRequest,
      },
    );
  typia.assert(allOptions);
  TestValidator.equals("full page records", allOptions.pagination.records, 5);
  TestValidator.equals("full page pages", allOptions.pagination.pages, 1);
  TestValidator.equals("full page current", allOptions.pagination.current, 1);
  TestValidator.equals("full page limit", allOptions.pagination.limit, 5);
  TestValidator.equals("full page data count", allOptions.data.length, 5);
}
