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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
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
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_product_variant_listing_basic(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication and category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {},
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Step 2: Seller authentication and product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {},
  });
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        basePrice: 10000,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 3: Create multiple variants with different option combinations
  const variantRedS =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-RED-S-${RandomGenerator.alphaNumeric(6)}`,
          price: 10000,
          stock: 10,
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "S" },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantRedS);
  const variantRedM =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-RED-M-${RandomGenerator.alphaNumeric(6)}`,
          price: 11000,
          stock: 15,
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "M" },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantRedM);
  const variantBlueS =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-BLUE-S-${RandomGenerator.alphaNumeric(6)}`,
          price: null,
          stock: 5,
          options: [
            { optionName: "Color", optionValue: "Blue" },
            { optionName: "Size", optionValue: "S" },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantBlueS);
  const variantBlueM =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-BLUE-M-${RandomGenerator.alphaNumeric(6)}`,
          price: 12000,
          stock: 0,
          options: [
            { optionName: "Color", optionValue: "Blue" },
            { optionName: "Size", optionValue: "M" },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantBlueM);
  // Step 4: List variants with default pagination
  const variantList =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId: product.id,
      body: {
        cursor: null,
        limit: 20,
        sort: "createdAt",
        order: "desc",
        optionFilters: {},
        isAvailable: false,
        minPrice: null,
        maxPrice: null,
        page: null,
      } satisfies IEcommerceMallProductVariant.IRequest,
    });
  typia.assert(variantList);
  // Step 5: Verify pagination metadata
  TestValidator.equals("variant count", variantList.data.length, 4);
  TestValidator.equals(
    "pagination current page",
    variantList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", variantList.pagination.limit, 20);
  TestValidator.equals("total records", variantList.pagination.records, 4);
  TestValidator.equals("total pages", variantList.pagination.pages, 1);
  // Step 6: Verify all variants are present with correct SKU codes
  const skuSet = new Set(variantList.data.map((v) => v.skuCode));
  TestValidator.predicate("contains Red-S variant SKU", () =>
    skuSet.has(variantRedS.skuCode),
  );
  TestValidator.predicate("contains Red-M variant SKU", () =>
    skuSet.has(variantRedM.skuCode),
  );
  TestValidator.predicate("contains Blue-S variant SKU", () =>
    skuSet.has(variantBlueS.skuCode),
  );
  TestValidator.predicate("contains Blue-M variant SKU", () =>
    skuSet.has(variantBlueM.skuCode),
  );
  // Step 7: Verify specific variant details
  const foundRedS = variantList.data.find(
    (v) => v.skuCode === variantRedS.skuCode,
  );
  const foundRedM = variantList.data.find(
    (v) => v.skuCode === variantRedM.skuCode,
  );
  const foundBlueS = variantList.data.find(
    (v) => v.skuCode === variantBlueS.skuCode,
  );
  const foundBlueM = variantList.data.find(
    (v) => v.skuCode === variantBlueM.skuCode,
  );
  // Use typia.assert with non-null assertion to properly narrow types
  const safeFoundRedS = typia.assert(foundRedS!);
  const safeFoundRedM = typia.assert(foundRedM!);
  const safeFoundBlueS = typia.assert(foundBlueS!);
  const safeFoundBlueM = typia.assert(foundBlueM!);
  // Verify Red-S variant (specific price, in stock)
  TestValidator.equals("Red-S price", safeFoundRedS.price, 10000);
  TestValidator.equals("Red-S currentStock", safeFoundRedS.currentStock, 10);
  TestValidator.equals("Red-S isAvailable", safeFoundRedS.isAvailable, true);
  TestValidator.predicate("Red-S has Color:Red option", () =>
    safeFoundRedS.options.some(
      (o) => o.optionName === "Color" && o.optionValue === "Red",
    ),
  );
  TestValidator.predicate("Red-S has Size:S option", () =>
    safeFoundRedS.options.some(
      (o) => o.optionName === "Size" && o.optionValue === "S",
    ),
  );
  // Verify Red-M variant (different price, in stock)
  TestValidator.equals("Red-M price", safeFoundRedM.price, 11000);
  TestValidator.equals("Red-M currentStock", safeFoundRedM.currentStock, 15);
  TestValidator.equals("Red-M isAvailable", safeFoundRedM.isAvailable, true);
  // Verify Blue-S variant (null price - falls back to base, in stock)
  TestValidator.equals("Blue-S price", safeFoundBlueS.price, null);
  TestValidator.equals("Blue-S currentStock", safeFoundBlueS.currentStock, 5);
  TestValidator.equals("Blue-S isAvailable", safeFoundBlueS.isAvailable, true);
  // Verify Blue-M variant (specific price, out of stock)
  TestValidator.equals("Blue-M price", safeFoundBlueM.price, 12000);
  TestValidator.equals("Blue-M currentStock", safeFoundBlueM.currentStock, 0);
  TestValidator.equals("Blue-M isAvailable", safeFoundBlueM.isAvailable, false);
}
