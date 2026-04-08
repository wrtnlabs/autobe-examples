import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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
 * Test variant snapshot retrieval after product variant edit operation.
 *
 * Validates the complete workflow of variant snapshot creation and retrieval when a product variant is edited. Ensures that variant snapshots are automatically created during variant updates and can be retrieved with correct historical data preservation.
 *
 * The test verifies that each variant snapshot captures the exact state of the variant at the time of the product edit, including SKU code, option values, price, and stock quantity. This audit trail mechanism enables dispute resolution and historical reconstruction of product configurations.
 *
 * 1. Seller registers and authenticates on the platform.
 * 2. Seller creates a product with name, description, category, and base price.
 * 3. Seller creates multiple variants for the product with different configurations.
 * 4. Seller edits one variant triggering automatic product and variant snapshot creation.
 * 5. Seller retrieves product snapshots to obtain the productSnapshotId.
 * 6. Seller retrieves variant snapshots for the product snapshot and validates the response.
 */
export async function test_api_product_variant_snapshot_list_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create multiple variants for the product
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "RED-LARGE",
          option_values: "Color: Red, Size: Large",
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "BLUE-SMALL",
          option_values: "Color: Blue, Size: Small",
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(variant2);
  const variant3 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "GREEN-MEDIUM",
          option_values: "Color: Green, Size: Medium",
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(variant3);
  // 4. Edit one variant to trigger product and variant snapshot creation
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant1.id,
        body: {
          sku_code: "RED-LARGE-V2",
          option_values: "Color: Red, Size: Large, Premium",
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<2000>
          >(),
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Retrieve product snapshots to get the productSnapshotId
  const productSnapshots =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(productSnapshots);
  // Validate product snapshots response
  TestValidator.predicate(
    "has at least one snapshot",
    () => productSnapshots.data.length > 0,
  );
  const productSnapshot = productSnapshots.data[0]!;
  const productSnapshotId = productSnapshot.id;
  // 6. Retrieve variant snapshots for the product snapshot
  const variantSnapshots =
    await api.functional.shoppingMall.seller.productSnapshots.variantSnapshots.index(
      sellerConnection,
      {
        productSnapshotId: productSnapshotId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(variantSnapshots);
  // Validate variant snapshots response structure
  TestValidator.predicate(
    "has variant snapshots",
    () => variantSnapshots.data.length > 0,
  );
  // Validate pagination metadata
  TestValidator.equals("current page", variantSnapshots.pagination.current, 1);
  TestValidator.predicate(
    "limit is set",
    () => variantSnapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count matches data",
    () => variantSnapshots.pagination.records >= variantSnapshots.data.length,
  );
  TestValidator.predicate(
    "pages count is valid",
    () => variantSnapshots.pagination.pages > 0,
  );
  // Validate variant snapshots are sorted by createdAt DESC
  if (variantSnapshots.data.length > 1) {
    for (let i = 1; i < variantSnapshots.data.length; i++) {
      const prevDate = new Date(variantSnapshots.data[i - 1]!.createdAt);
      const currDate = new Date(variantSnapshots.data[i]!.createdAt);
      TestValidator.predicate(
        `snapshot ${i} createdAt is before or equal to snapshot ${i - 1}`,
        () => prevDate >= currDate,
      );
    }
  }
  // Validate all variant snapshots have the same createdAt (from same product edit)
  const firstCreatedAt = variantSnapshots.data[0]!.createdAt;
  for (const variantSnapshot of variantSnapshots.data) {
    TestValidator.equals(
      "all snapshots created at same time",
      variantSnapshot.createdAt,
      firstCreatedAt,
    );
  }
  // Validate productSnapshot createdAt matches variant snapshot createdAt
  TestValidator.equals(
    "variant snapshot createdAt matches product snapshot",
    variantSnapshots.data[0]!.createdAt,
    productSnapshot.created_at,
  );
  // Validate each variant snapshot has productVariant reference with valid data
  for (const variantSnapshot of variantSnapshots.data) {
    TestValidator.predicate(
      "productVariant has valid id",
      () => variantSnapshot.productVariant.id.length > 0,
    );
    TestValidator.predicate(
      "productVariant has sku_code",
      () => variantSnapshot.productVariant.sku_code.length > 0,
    );
  }
}
