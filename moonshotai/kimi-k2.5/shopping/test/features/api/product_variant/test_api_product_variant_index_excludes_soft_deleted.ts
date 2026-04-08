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

export async function test_api_product_variant_index_excludes_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication and category creation
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  await authorize_admin_join(adminConnection, {
    body: {
      href: "https://test.api/admin",
      referrer: "https://test.api/",
    },
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Step 2: Seller authentication
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  await authorize_seller_join(sellerConnection, {
    body: {
      href: "https://test.api/seller",
      referrer: "https://test.api/",
    },
  });
  // Step 3: Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // Step 4: Create Variant A (will be deleted)
  const variantA =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "VARIANT-A-DELETED",
          price: 100,
          options: [
            {
              optionName: "Color",
              optionValue: "Red-Deleted",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantA);
  // Step 5: Soft-delete Variant A
  await api.functional.ecommerceMall.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      productVariantId: variantA.id,
    },
  );
  // Step 6: Create Variant B (active)
  const variantB =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "VARIANT-B-ACTIVE",
          price: 200,
          options: [
            {
              optionName: "Color",
              optionValue: "Green-Active",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantB);
  // Step 7: Create Variant C (active)
  const variantC =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "VARIANT-C-ACTIVE",
          price: 300,
          options: [
            {
              optionName: "Color",
              optionValue: "Blue-Active",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantC);
  // Step 8: List variants without filters to verify only active variants returned
  const allVariants =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {} satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(allVariants);
  // Verify: Variant A (deleted) should NOT appear, only B and C should be present
  const variantIds = allVariants.data.map((v) => v.id);
  TestValidator.predicate(
    "deleted variant A not in results",
    !variantIds.includes(variantA.id),
  );
  TestValidator.predicate(
    "active variant B in results",
    variantIds.includes(variantB.id),
  );
  TestValidator.predicate(
    "active variant C in results",
    variantIds.includes(variantC.id),
  );
  TestValidator.equals("total active variants", variantIds.length, 2);
  // Step 9: Verify pagination metadata excludes deleted count
  TestValidator.equals(
    "pagination records count excludes deleted",
    allVariants.pagination.records,
    2,
  );
  // Step 10: Search for deleted variant's SKU - should return no results
  const deletedSkuSearch =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          search: "VARIANT-A-DELETED",
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(deletedSkuSearch);
  TestValidator.equals(
    "search for deleted sku returns no results",
    deletedSkuSearch.data.length,
    0,
  );
  // Step 11: Filter by option value from deleted variant - should return no results
  const deletedOptionFilter =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          optionName: "Color",
          optionValue: "Red-Deleted",
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(deletedOptionFilter);
  TestValidator.equals(
    "filter by deleted variant option returns no results",
    deletedOptionFilter.data.length,
    0,
  );
  // Step 12: Verify active variants are searchable
  const activeVariantSearch =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          search: "VARIANT-B",
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(activeVariantSearch);
  TestValidator.equals(
    "search for active variant sku returns result",
    activeVariantSearch.data.length,
    1,
  );
  TestValidator.equals(
    "found variant is variant B",
    activeVariantSearch.data[0]!.id,
    variantB.id,
  );
}