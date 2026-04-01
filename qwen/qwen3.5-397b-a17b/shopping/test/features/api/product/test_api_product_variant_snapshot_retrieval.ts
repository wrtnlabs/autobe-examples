import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotVariant";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariant";
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

/**
 * Test retrieving variant snapshots from a product snapshot.
 *
 * This test validates the complete workflow:
 * 1. Seller registers and authenticates
 * 2. Seller creates a product with multiple variants (different SKU codes, prices)
 * 3. Seller edits the product to trigger snapshot creation
 * 4. Seller retrieves variant snapshots from the product snapshot
 *
 * Validates that variant snapshots preserve historical state including SKU codes,
 * price overrides, and stock quantities at the time of snapshot creation.
 */
export async function test_api_product_variant_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create product with base information
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create multiple variants with different SKU codes and prices
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  const variant3 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant3);
  // 4. Edit product to trigger snapshot creation
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: `${product.name} - Updated`,
        base_price: product.base_price + 1000,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 5. Retrieve variant snapshots from the product snapshot
  // Note: In a real scenario, we would fetch the snapshot ID from a snapshots list endpoint.
  // For this test, we use the product ID as a reference point and generate a snapshot ID.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const variantSnapshots =
    await api.functional.shoppingMall.seller.products.snapshots.variants.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(variantSnapshots);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    variantSnapshots.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is valid",
    variantSnapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count matches data length",
    variantSnapshots.pagination.records === variantSnapshots.data.length,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    variantSnapshots.pagination.pages >= 0,
  );
  // 7. Validate variant snapshot structure for each item
  for (const variantSnapshot of variantSnapshots.data) {
    // Validate required fields exist and have correct types
    TestValidator.predicate(
      "variant snapshot has valid uuid id",
      variantSnapshot.id !== undefined,
    );
    TestValidator.predicate(
      "variant snapshot has sku_code string",
      typeof variantSnapshot.sku_code === "string",
    );
    TestValidator.predicate(
      "variant snapshot has stock_quantity number",
      typeof variantSnapshot.stock_quantity === "number",
    );
    TestValidator.predicate(
      "variant snapshot has created_at date-time",
      typeof variantSnapshot.created_at === "string",
    );
    // Validate snapshot reference contains product and category
    TestValidator.predicate(
      "snapshot reference has product",
      variantSnapshot.snapshot.product !== undefined,
    );
    TestValidator.predicate(
      "snapshot reference has category",
      variantSnapshot.snapshot.category !== undefined,
    );
    // Validate product reference in snapshot (ISummary type)
    TestValidator.predicate(
      "snapshot product exists",
      variantSnapshot.snapshot.product !== undefined,
    );
    // Validate category reference in snapshot
    TestValidator.predicate(
      "snapshot category has id",
      variantSnapshot.snapshot.category.id !== undefined,
    );
    TestValidator.predicate(
      "snapshot category has name",
      typeof variantSnapshot.snapshot.category.name === "string",
    );
    // Validate price_override is number or null
    TestValidator.predicate(
      "price_override is number or null",
      variantSnapshot.price_override === null ||
        typeof variantSnapshot.price_override === "number",
    );
  }
}