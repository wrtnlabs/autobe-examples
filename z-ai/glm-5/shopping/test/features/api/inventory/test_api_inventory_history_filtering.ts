import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_history_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create administrator and seller accounts
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create category (as administrator)
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Create product (as seller)
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: category.id,
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 4. Create product variant (as seller)
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 5. Create multiple inventory records with different characteristics
  const inventoryRecords: IShoppingMallInventoryRecord[] = [];
  // Create manual positive adjustments
  for (let i = 0; i < 3; i++) {
    const record =
      await generate_random_shopping_mall_seller_variants_inventory_adjust(
        sellerConnection,
        {
          params: {
            variantId: variant.id,
          },
          body: {
            quantity_change: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
            >(),
            reason: `Manual restocking batch ${i + 1}`,
          },
        },
      );
    typia.assert(record);
    inventoryRecords.push(record);
  }
  // Create manual negative adjustments
  for (let i = 0; i < 2; i++) {
    const positiveValue = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >();
    const record =
      await generate_random_shopping_mall_seller_variants_inventory_adjust(
        sellerConnection,
        {
          params: {
            variantId: variant.id,
          },
          body: {
            quantity_change: -positiveValue,
            reason: `Stock adjustment for damages ${i + 1}`,
          },
        },
      );
    typia.assert(record);
    inventoryRecords.push(record);
  }
  // Wait a moment for records to be properly stored
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 6. Test filtering by sourceType='manual' (as administrator)
  const manualRecords =
    await api.functional.shoppingMall.administrator.variants.inventory.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          sourceType: "manual",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(manualRecords);
  TestValidator.predicate(
    "all records have sourceType='manual'",
    manualRecords.data.every((r) => r.sourceType === "manual"),
  );
  // 7. Test filtering by quantityChangeType='positive'
  const positiveRecords =
    await api.functional.shoppingMall.administrator.variants.inventory.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          quantityChangeType: "positive",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(positiveRecords);
  TestValidator.predicate(
    "all records have positive quantity change",
    positiveRecords.data.every((r) => r.quantityChange > 0),
  );
  // 8. Test filtering by quantityChangeType='negative'
  const negativeRecords =
    await api.functional.shoppingMall.administrator.variants.inventory.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          quantityChangeType: "negative",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(negativeRecords);
  TestValidator.predicate(
    "all records have negative quantity change",
    negativeRecords.data.every((r) => r.quantityChange < 0),
  );
  // 9. Test text search on reason field
  const searchRecords =
    await api.functional.shoppingMall.administrator.variants.inventory.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          reason: "restocking",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(searchRecords);
  TestValidator.predicate(
    "all records contain search term in reason",
    searchRecords.data.every((r) =>
      r.reason.toLowerCase().includes("restocking"),
    ),
  );
  // 10. Test pagination
  const page1 =
    await api.functional.shoppingMall.administrator.variants.inventory.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate("page 1 has correct limit", page1.data.length <= 2);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  if (page1.pagination.pages > 1) {
    const page2 =
      await api.functional.shoppingMall.administrator.variants.inventory.index(
        adminConnection,
        {
          variantId: variant.id,
          body: {
            page: 2,
            limit: 2,
          } satisfies IShoppingMallInventoryRecord.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.predicate(
      "page 2 has different records than page 1",
      !page1.data.some((r1) => page2.data.some((r2) => r1.id === r2.id)),
    );
  }
  // 11. Test combined filters (sourceType + quantityChangeType)
  const combinedRecords =
    await api.functional.shoppingMall.administrator.variants.inventory.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          sourceType: "manual",
          quantityChangeType: "positive",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(combinedRecords);
  TestValidator.predicate(
    "combined filter: all records are manual and positive",
    combinedRecords.data.every(
      (r) => r.sourceType === "manual" && r.quantityChange > 0,
    ),
  );
  // 12. Verify total record count matches expectations
  const allRecords =
    await api.functional.shoppingMall.administrator.variants.inventory.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {} satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(allRecords);
  TestValidator.predicate(
    "all records count matches created records",
    allRecords.pagination.records >= inventoryRecords.length,
  );
}
