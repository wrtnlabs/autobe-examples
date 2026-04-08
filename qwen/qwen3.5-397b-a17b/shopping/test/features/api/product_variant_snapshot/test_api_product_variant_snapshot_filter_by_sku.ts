import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test filtering variant snapshots by SKU code search term.
 *
 * Validates the complete variant snapshot filtering workflow including seller authentication, product and variant creation, snapshot generation through variant updates, and SKU-based filtering of variant snapshots.
 *
 * Special attention is given to verifying that the partial match search correctly filters variant snapshots by SKU code, returning only variants containing the search term while excluding others. The test creates four variants with distinct SKU patterns (RED-LARGE, RED-SMALL, BLUE-LARGE, BLUE-SMALL) and verifies that searching for 'RED' returns exactly two matching variants.
 *
 * 1. Seller registers and authenticates using authorize_seller_join utility function.
 * 2. Product is created with randomized name, description, and base price.
 * 3. Four variants created with distinct SKU codes: RED-LARGE, RED-SMALL, BLUE-LARGE, BLUE-SMALL.
 * 4. One variant is updated to trigger automatic snapshot creation for product and all variants.
 * 5. Product snapshots retrieved to obtain productSnapshotId for variant snapshot query.
 * 6. Variant snapshots queried with search='RED' filter to test partial match functionality.
 * 7. Validates only RED variants returned (2 items), BLUE variants excluded, pagination metadata correct, and each snapshot contains required historical fields.
 */
export async function test_api_product_variant_snapshot_filter_by_sku(
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
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create multiple variants with distinct SKU codes for filtering test
  const variantSkus = [
    "RED-LARGE",
    "RED-SMALL",
    "BLUE-LARGE",
    "BLUE-SMALL",
  ] as const;
  const createdVariants: IShoppingMallProductVariant[] = [];
  for (const sku of variantSkus) {
    const color = sku.split("-")[0];
    const size = sku.split("-")[1];
    const variant =
      await api.functional.shoppingMall.seller.products.variants.create(
        sellerConnection,
        {
          productId: product.id,
          body: {
            sku_code: sku,
            option_values: `Color: ${color}, Size: ${size}`,
            price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
    typia.assert(variant);
    createdVariants.push(variant);
  }
  // 4. Update a variant to trigger snapshot creation
  const variantToUpdate = createdVariants[0];
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variantToUpdate.id,
        body: {
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Retrieve product snapshots to get productSnapshotId
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
  TestValidator.predicate(
    "product snapshots exist",
    productSnapshots.data.length > 0,
  );
  const productSnapshotId = productSnapshots.data[0].id;
  // 6. Query variant snapshots with search='RED' filter (case-insensitive partial match)
  const variantSnapshots =
    await api.functional.shoppingMall.seller.productSnapshots.variantSnapshots.index(
      sellerConnection,
      {
        productSnapshotId: productSnapshotId,
        body: {
          search: "RED",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(variantSnapshots);
  // 7. Validate filtering results
  TestValidator.predicate(
    "only RED variants returned",
    variantSnapshots.data.every((snapshot) =>
      snapshot.skuCode.toUpperCase().includes("RED"),
    ),
  );
  TestValidator.predicate(
    "BLUE variants excluded",
    variantSnapshots.data.every(
      (snapshot) => !snapshot.skuCode.toUpperCase().includes("BLUE"),
    ),
  );
  TestValidator.equals(
    "correct number of RED variants",
    variantSnapshots.data.length,
    2,
  );
  TestValidator.equals(
    "pagination records match data length",
    variantSnapshots.pagination.records,
    variantSnapshots.data.length,
  );
  TestValidator.predicate(
    "each snapshot has required historical fields",
    variantSnapshots.data.every(
      (snapshot) =>
        snapshot.skuCode !== undefined &&
        snapshot.optionValues !== undefined &&
        typeof snapshot.price === "number" &&
        typeof snapshot.stockQuantity === "number" &&
        snapshot.productVariant !== undefined,
    ),
  );
  // Verify pagination metadata
  TestValidator.equals(
    "current page is 1",
    variantSnapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    variantSnapshots.pagination.pages >= 1,
  );
}