import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Seller authentication
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
  // 3. Create product with seller
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
  // 4. Create initial variant with seller
  const initialSkuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const initialPriceOverride = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const optionValueIds = product.optionDefinitions
    .flatMap((def) => def.optionValues.map((val) => val.id))
    .slice(0, product.optionDefinitions.length);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: initialSkuCode,
          price_override: initialPriceOverride,
          option_value_ids: optionValueIds,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Edit variant multiple times to create snapshots
  const editCount = 3;
  const editedSkus: string[] = [initialSkuCode];
  const editedPrices: (number | null)[] = [initialPriceOverride];
  for (let i = 0; i < editCount; i++) {
    const newSkuCode = `SKU-EDIT-${i}-${RandomGenerator.alphaNumeric(6)}`;
    const newPriceOverride =
      i === editCount - 1
        ? null
        : typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>();
    const updatedVariant =
      await api.functional.shoppingMall.seller.products.variants.update(
        sellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
          body: {
            sku_code: newSkuCode,
            price_override: newPriceOverride,
          } satisfies IShoppingMallProductVariant.IUpdate,
        },
      );
    typia.assert(updatedVariant);
    editedSkus.push(newSkuCode);
    editedPrices.push(newPriceOverride);
  }
  // 6. Administrator retrieves variant snapshots
  const snapshotResponse =
    await api.functional.shoppingMall.administrator.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 10,
          sort: {
            field: "created_at",
            order: "DESC",
          },
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 7. Validate pagination structure
  TestValidator.equals("current page", snapshotResponse.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive",
    snapshotResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    snapshotResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    snapshotResponse.pagination.pages >= 0,
  );
  // 8. Validate snapshot count matches edits (initial creation + edits = editCount + 1)
  const expectedSnapshotCount = editCount + 1;
  TestValidator.equals(
    "snapshot count matches edits",
    snapshotResponse.data.length,
    expectedSnapshotCount,
  );
  TestValidator.equals(
    "pagination records match data length",
    snapshotResponse.pagination.records,
    snapshotResponse.data.length,
  );
  // 9. Validate snapshots are sorted by created_at DESC (newest first)
  for (let i = 1; i < snapshotResponse.data.length; i++) {
    const prevSnapshot = snapshotResponse.data[i - 1];
    const currentSnapshot = snapshotResponse.data[i];
    const prevTime = new Date(prevSnapshot.created_at).getTime();
    const currentTime = new Date(currentSnapshot.created_at).getTime();
    TestValidator.predicate(
      `snapshot ${i - 1} is newer than or equal to snapshot ${i}`,
      prevTime >= currentTime,
    );
  }
  // 10. Validate snapshot data reflects variant state at each edit point
  // The first snapshot (index 0) should have the most recent SKU code
  TestValidator.equals(
    "first snapshot has latest SKU",
    snapshotResponse.data[0].sku_code,
    editedSkus[editedSkus.length - 1],
  );
  // 11. Validate each snapshot contains complete option combination details
  for (const snapshot of snapshotResponse.data) {
    TestValidator.predicate(
      "snapshot has option values",
      snapshot.optionValues.length > 0,
    );
    // Validate option value structure
    for (const optionValue of snapshot.optionValues) {
      TestValidator.predicate(
        "option definition has name",
        optionValue.optionDefinition.name.length > 0,
      );
      TestValidator.predicate(
        "option value has name",
        optionValue.name.length > 0,
      );
    }
  }
  // 12. Validate price_override values in snapshots match edit history
  // Last snapshot (oldest) should have initial price
  const oldestSnapshot =
    snapshotResponse.data[snapshotResponse.data.length - 1];
  TestValidator.equals(
    "oldest snapshot has initial price override",
    oldestSnapshot.price_override,
    initialPriceOverride,
  );
  // 13. Validate administrator can access snapshots regardless of seller ownership
  TestValidator.predicate(
    "administrator retrieved snapshots successfully",
    snapshotResponse.data.length === expectedSnapshotCount,
  );
}
