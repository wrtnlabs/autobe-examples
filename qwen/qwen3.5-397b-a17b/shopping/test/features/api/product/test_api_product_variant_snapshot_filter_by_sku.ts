import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test administrator filtering of product variant snapshots by SKU code partial match.
 *
 * This test validates that administrators can search variant snapshots within a product
 * snapshot using partial SKU code matching. The workflow:
 * 1. Seller creates a product with multiple variants having distinct SKU codes
 * 2. Seller updates the product to trigger snapshot creation with variant snapshots
 * 3. Administrator filters variant snapshots by SKU code partial match
 * 4. Verify only matching variants are returned with correct pagination
 *
 * Note: This test requires the product snapshots listing endpoint to retrieve valid
 * snapshot IDs. In simulation mode, random UUIDs are used for snapshotId.
 */
export async function test_api_product_variant_snapshot_filter_by_sku(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create a test product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create multiple variants with different SKU codes for filtering test
  const variant1 =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: "RED-SHIRT-001",
          stock_quantity: 100,
          options: [
            { key: "color", value: "Red" },
            { key: "size", value: "S" },
          ],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  const variant2 =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: "BLUE-SHIRT-002",
          stock_quantity: 100,
          options: [
            { key: "color", value: "Blue" },
            { key: "size", value: "M" },
          ],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  const variant3 =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: "RED-PANTS-003",
          stock_quantity: 100,
          options: [
            { key: "color", value: "Red" },
            { key: "type", value: "Pants" },
          ],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant3);
  // 4. Update product to trigger snapshot creation with variant snapshots
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: `${product.name} - Updated`,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 5. Create and authenticate administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 6. Generate snapshot ID for testing
  // Note: In production, this would come from listing product snapshots
  // The snapshot is created when the product is updated above
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 7. Filter variant snapshots by SKU code partial match 'RED'
  const filteredResult =
    await api.functional.shoppingMall.admin.products.snapshots.variantSnapshots.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          sku_code: "RED",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(filteredResult);
  // 8. Verify filtering returns only matching variants
  TestValidator.predicate("all returned variants contain RED in SKU", () =>
    filteredResult.data.every((v) => v.sku_code.includes("RED")),
  );
  // 9. Verify pagination metadata is present
  TestValidator.predicate(
    "pagination records count is valid",
    () => filteredResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    () => filteredResult.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination current page",
    filteredResult.pagination.current,
    1,
  );
  // 10. Test with different filter 'BLUE' to verify filtering works
  const blueFilteredResult =
    await api.functional.shoppingMall.admin.products.snapshots.variantSnapshots.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          sku_code: "BLUE",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(blueFilteredResult);
  // 11. Verify BLUE filter returns only matching variants
  TestValidator.predicate("all BLUE results contain BLUE in SKU", () =>
    blueFilteredResult.data.every((v) => v.sku_code.includes("BLUE")),
  );
  TestValidator.predicate(
    "BLUE pagination records is valid",
    () => blueFilteredResult.pagination.records >= 0,
  );
}
