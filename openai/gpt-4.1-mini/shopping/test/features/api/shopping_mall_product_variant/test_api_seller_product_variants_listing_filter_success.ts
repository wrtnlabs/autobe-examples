import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_seller_product_variants_listing_filter_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1!",
      shopName: RandomGenerator.name(2),
      shopDescription: null,
      logoUri: null,
    },
  });
  // Authorization header is set internally in authorize_seller_join
  // 2. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
        product_subcategory_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 3. Simulate product variants data for testing filtering logic
  // Note: Product variants creation isn't exposed via API, so we simulate
  // variants data locally which would be similar to what the real variants
  // might look like.
  const variantCount = 10;
  const variants: IShoppingMallProductVariant.ISummary[] = [];
  for (let i = 0; i < variantCount; i++) {
    const skuBase = `SKU${i + 100}`;
    const priceOverride = i % 2 === 0 ? product.basePrice + i * 100 : null;
    const stockQuantity = (i + 1) * 10;
    variants.push({
      id: typia.random<string & tags.Format<"uuid">>(),
      skuCode: skuBase,
      priceOverride: priceOverride,
      stockQuantity: stockQuantity as number & tags.Type<"int32">,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });
  }
  // 4. Define test filters
  const filterSkuPartial = variants[3].skuCode.substring(1, 4); // partial substring
  const priceMin = product.basePrice + 100;
  const priceMax = product.basePrice + 400;
  const stockMin = 20;
  const stockMax = 80;
  // 5. Call variants listing endpoint with filters and pagination
  const limit = 5;
  const page1 =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: filterSkuPartial,
          priceOverrideMin: priceMin,
          priceOverrideMax: priceMax,
          stockQuantityMin: stockMin,
          stockQuantityMax: stockMax,
          page: 1,
          limit: limit,
        },
      },
    );
  typia.assert(page1);
  // 6. Validate filtered results: all variants should match filters
  TestValidator.predicate(
    "all variants match partial skuCode",
    page1.data.every((v) => v.skuCode.includes(filterSkuPartial)),
  );
  TestValidator.predicate(
    "all variants priceOverride within range or null",
    page1.data.every(
      (v) =>
        v.priceOverride === null ||
        (v.priceOverride !== undefined &&
          v.priceOverride >= priceMin &&
          v.priceOverride <= priceMax),
    ),
  );
  TestValidator.predicate(
    "all variants stockQuantity within range",
    page1.data.every(
      (v) => v.stockQuantity >= stockMin && v.stockQuantity <= stockMax,
    ),
  );
  TestValidator.equals("pagination current page", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, limit);
  TestValidator.predicate(
    "records count greater or equal data length",
    page1.pagination.records >= page1.data.length,
  );
  // 7. Check that variants are unique by id
  TestValidator.predicate(
    "variants are unique by id",
    new Set(page1.data.map((v) => v.id)).size === page1.data.length,
  );
  // 8. Call page 2 with same filters
  const page2 =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: filterSkuPartial,
          priceOverrideMin: priceMin,
          priceOverrideMax: priceMax,
          stockQuantityMin: stockMin,
          stockQuantityMax: stockMax,
          page: 2,
          limit: limit,
        },
      },
    );
  typia.assert(page2);
  TestValidator.equals(
    "pagination current page (page 2)",
    page2.pagination.current,
    2,
  );
  // 9. Test no match filter returns empty
  const noMatchFilter = "NON_EXISTENT_SKU";
  const emptyResult =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: noMatchFilter,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty data array on no matching filter",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records zero on no matching filter",
    emptyResult.pagination.records,
    0,
  );
  // 10. Test unauthorized access by another seller
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSeller = await authorize_seller_join(otherSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1!",
      shopName: RandomGenerator.name(2),
      shopDescription: null,
      logoUri: null,
    },
  });
  // Authorization header is set internally in authorize_seller_join
  await TestValidator.error(
    "unauthorized access to another seller's product variants",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.index(
        otherSellerConnection,
        {
          productId: product.id,
          body: { page: 1, limit: 5 },
        },
      );
    },
  );
}
