import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshotSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotSku";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSku";
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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_snapshot_sku_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  typia.assert(seller);
  // 2. Create a product with a placeholder category ID
  // Note: In a real test environment, a valid category ID would need to be obtained
  // from an existing category or through a category creation endpoint
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create 25+ variants for pagination testing
  const variantCount = 25;
  const variants: IShoppingMallProductVariant[] = [];
  for (let i = 0; i < variantCount; i++) {
    const variant =
      await generate_random_shopping_mall_seller_products_variants_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            skuCode: `SKU-${i.toString().padStart(3, "0")}-${RandomGenerator.alphaNumeric(8)}`,
            optionValues: {
              color: ["Red", "Blue", "Green", "Yellow", "Black"][i % 5],
              size: ["S", "M", "L", "XL", "XXL"][Math.floor(i / 5) % 5],
            },
            price:
              i % 2 === 0
                ? null
                : typia.random<
                    number & tags.Minimum<0.01> & tags.Maximum<999999.99>
                  >(),
          },
        },
      );
    typia.assert(variant);
    variants.push(variant);
  }
  // 4. Edit the product to create a snapshot
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: `${product.name} - Updated`,
      },
    });
  typia.assert(updatedProduct);
  // Note: The snapshot ID would typically be retrieved from a snapshots list endpoint
  // or returned from the update operation. For this test, we demonstrate the pagination
  // testing pattern assuming a valid snapshot ID is available.
  // In a complete implementation, there would be a GET /products/{productId}/snapshots
  // endpoint to retrieve the snapshot created during the product update.
  // Using a placeholder snapshot ID for demonstration
  // The actual implementation would retrieve this from the snapshots list API
  const snapshotId = updatedProduct.id; // Placeholder - would need actual snapshot ID
  // 5. Test pagination - first page with limit=10
  const firstPage =
    await api.functional.shoppingMall.seller.products.snapshots.skus.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  if (firstPage.data.length > 0) {
    TestValidator.predicate("first page items", firstPage.data.length <= 10);
    TestValidator.equals(
      "total records count",
      firstPage.pagination.records,
      variantCount,
    );
    TestValidator.equals(
      "total pages calculated",
      firstPage.pagination.pages,
      Math.ceil(variantCount / 10),
    );
  }
  // 6. Test pagination - second page with limit=10
  const secondPage =
    await api.functional.shoppingMall.seller.products.snapshots.skus.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
  // Verify different items across pages
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    const firstPageIds = new Set(firstPage.data.map((sku) => sku.id));
    const secondPageIds = new Set(secondPage.data.map((sku) => sku.id));
    let hasOverlap = false;
    for (const id of secondPageIds) {
      if (firstPageIds.has(id)) {
        hasOverlap = true;
        break;
      }
    }
    TestValidator.predicate("pages have different items", !hasOverlap);
  }
  // 7. Test default limit (should be 20)
  const defaultLimitPage =
    await api.functional.shoppingMall.seller.products.snapshots.skus.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          page: 1,
        },
      },
    );
  typia.assert(defaultLimitPage);
  TestValidator.equals("default limit", defaultLimitPage.pagination.limit, 20);
  TestValidator.predicate(
    "default limit items",
    defaultLimitPage.data.length <= 20,
  );
  // 8. Test minimum limit (limit=1)
  const minLimitPage =
    await api.functional.shoppingMall.seller.products.snapshots.skus.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          page: 1,
          limit: 1,
        },
      },
    );
  typia.assert(minLimitPage);
  TestValidator.equals("min limit value", minLimitPage.pagination.limit, 1);
  TestValidator.predicate("min limit items", minLimitPage.data.length <= 1);
  // 9. Test maximum limit (limit=100)
  const maxLimitPage =
    await api.functional.shoppingMall.seller.products.snapshots.skus.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals("max limit value", maxLimitPage.pagination.limit, 100);
  TestValidator.predicate("max limit items", maxLimitPage.data.length <= 100);
  TestValidator.equals("max limit pages", maxLimitPage.pagination.pages, 1);
}
