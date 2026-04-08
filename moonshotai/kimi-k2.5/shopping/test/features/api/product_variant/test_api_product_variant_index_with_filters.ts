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
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
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

/**
 * Test product variant index endpoint with various filters including
 * SKU search, option filtering, stock status filtering, and pagination.
 *
 * 1. Admin creates category
 * 2. Seller joins and creates product with category
 * 3. Seller creates 3 variants: Red/S, Blue/M, Red/L
 * 4. Test basic listing - verify all variants returned with pagination metadata
 * 5. Test SKU partial search - verify partial matching works
 * 6. Test option filter (Color=Red) - verify 2 Red variants returned
 * 7. Test stock filters - verify inStock and outOfStock filtering
 * 8. Test pagination with limit=2 - verify page 1 has 2 items, page 2 has 1 item
 */
export async function test_api_product_variant_index_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication and category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
      href: "https://test.com/admin",
      referrer: "https://test.com",
      ip: null,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: `Category-${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}`,
        description: "Test category for product variants",
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // Step 2: Seller authentication and product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "SellerPass123!",
      href: "https://test.com/seller",
      referrer: "https://test.com",
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `Test Product ${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}`,
        description: "Test product for variant filtering",
        categoryId: category.id,
        basePrice: 10000,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 3: Create three variants with different SKU and option combinations
  const variantRedS =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "SKU-RED-S-001",
          price: 12000,
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "S" },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantRedS);
  const variantBlueM =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "SKU-BLUE-M-002",
          price: 13000,
          options: [
            { optionName: "Color", optionValue: "Blue" },
            { optionName: "Size", optionValue: "M" },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantBlueM);
  const variantRedL =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "SKU-RED-L-003",
          price: 14000,
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "L" },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantRedL);
  const allVariantIds = [variantRedS.id, variantBlueM.id, variantRedL.id];
  // Test Scenario 1: Basic listing without filters
  const basicResult: IPageIEcommerceMallProductVariant.ISummary =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId: product.id,
      body: {} satisfies IEcommerceMallProductVariant.IRequest,
    });
  typia.assert(basicResult);
  TestValidator.equals(
    "basic listing returns all 3 variants",
    basicResult.data.length,
    3,
  );
  TestValidator.predicate(
    "all variants have required fields (id, skuCode, options)",
    basicResult.data.every(
      (v) =>
        v.id && v.skuCode && Array.isArray(v.options) && v.options.length > 0,
    ),
  );
  TestValidator.predicate(
    "all variants have timestamps",
    basicResult.data.every((v) => v.createdAt && v.updatedAt),
  );
  // Verify all created variants are present
  const returnedIds = basicResult.data.map((v) => v.id);
  TestValidator.predicate(
    "all created variant IDs are present",
    allVariantIds.every((id) => returnedIds.includes(id)),
  );
  // Test Scenario 2: SKU partial search
  const skuSearchResult: IPageIEcommerceMallProductVariant.ISummary =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId: product.id,
      body: {
        search: "SKU-RED",
      } satisfies IEcommerceMallProductVariant.IRequest,
    });
  typia.assert(skuSearchResult);
  TestValidator.equals(
    "SKU search 'SKU-RED' returns 2 variants",
    skuSearchResult.data.length,
    2,
  );
  TestValidator.predicate(
    "all returned variants contain 'SKU-RED' in SKU code",
    skuSearchResult.data.every((v) => v.skuCode.includes("SKU-RED")),
  );
  // Test partial matching with middle of SKU
  const partialSkuResult: IPageIEcommerceMallProductVariant.ISummary =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId: product.id,
      body: {
        search: "S-00",
      } satisfies IEcommerceMallProductVariant.IRequest,
    });
  typia.assert(partialSkuResult);
  TestValidator.predicate(
    "partial SKU search finds all matching variants",
    partialSkuResult.data.every((v) => v.skuCode.includes("S-00")),
  );
  // Test Scenario 3: Option filter - Color=Red
  const colorRedResult: IPageIEcommerceMallProductVariant.ISummary =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId: product.id,
      body: {
        optionName: "Color",
        optionValue: "Red",
      } satisfies IEcommerceMallProductVariant.IRequest,
    });
  typia.assert(colorRedResult);
  TestValidator.equals(
    "option filter Color=Red returns 2 variants",
    colorRedResult.data.length,
    2,
  );
  TestValidator.predicate(
    "all returned variants have Color=Red option",
    colorRedResult.data.every((v) =>
      v.options.some(
        (opt) => opt.optionName === "Color" && opt.optionValue === "Red",
      ),
    ),
  );
  // Option filter for Blue
  const colorBlueResult: IPageIEcommerceMallProductVariant.ISummary =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId: product.id,
      body: {
        optionName: "Color",
        optionValue: "Blue",
      } satisfies IEcommerceMallProductVariant.IRequest,
    });
  typia.assert(colorBlueResult);
  TestValidator.equals(
    "option filter Color=Blue returns 1 variant",
    colorBlueResult.data.length,
    1,
  );
  TestValidator.predicate(
    "returned variant has Color=Blue option",
    colorBlueResult.data[0]!.options.some(
      (opt) => opt.optionName === "Color" && opt.optionValue === "Blue",
    ),
  );
  // Test Scenario 4: Stock filters
  const inStockResult: IPageIEcommerceMallProductVariant.ISummary =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId: product.id,
      body: {
        inStock: true,
      } satisfies IEcommerceMallProductVariant.IRequest,
    });
  typia.assert(inStockResult);
  const outOfStockResult: IPageIEcommerceMallProductVariant.ISummary =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId: product.id,
      body: {
        inStock: false,
      } satisfies IEcommerceMallProductVariant.IRequest,
    });
  typia.assert(outOfStockResult);
  // Total count should match sum of in-stock and out-of-stock
  const totalStockFiltered =
    inStockResult.data.length + outOfStockResult.data.length;
  TestValidator.equals(
    "inStock + outOfStock equals total variants",
    totalStockFiltered,
    3,
  );
  // Test Scenario 5: Pagination
  const page1Result: IPageIEcommerceMallProductVariant.ISummary =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId: product.id,
      body: {
        page: 1,
        limit: 2,
      } satisfies IEcommerceMallProductVariant.IRequest,
    });
  typia.assert(page1Result);
  TestValidator.equals("page 1 returns 2 items", page1Result.data.length, 2);
  TestValidator.equals(
    "pagination current page is 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 2",
    page1Result.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination total records is 3",
    page1Result.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination total pages is 2",
    page1Result.pagination.pages,
    2,
  );
  const page2Result: IPageIEcommerceMallProductVariant.ISummary =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId: product.id,
      body: {
        page: 2,
        limit: 2,
      } satisfies IEcommerceMallProductVariant.IRequest,
    });
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 returns 1 item (remaining)",
    page2Result.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page is 2",
    page2Result.pagination.current,
    2,
  );
  // Verify page 1 and page 2 have no overlap
  const page1Ids = page1Result.data.map((v) => v.id);
  const page2Ids = page2Result.data.map((v) => v.id);
  const overlapId = page1Ids.find((id) => page2Ids.includes(id));
  TestValidator.equals(
    "page 1 and page 2 have no overlapping variants",
    overlapId,
    undefined,
  );
  // Verify all 3 variants are present across both pages
  const allPageIds = [...page1Ids, ...page2Ids];
  TestValidator.predicate(
    "all 3 variants accounted for across pages",
    allVariantIds.every((id) => allPageIds.includes(id)),
  );
}
