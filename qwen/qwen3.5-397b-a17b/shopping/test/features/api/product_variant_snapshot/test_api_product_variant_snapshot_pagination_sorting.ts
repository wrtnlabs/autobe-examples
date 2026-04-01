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

/**
 * Test administrator retrieval of product variant snapshots with pagination and sorting.
 *
 * This test validates that administrators can access the complete audit trail of
 * product variant changes with proper pagination and sorting functionality.
 *
 * Setup:
 * 1. Create administrator account and authenticate
 * 2. Create seller account and authenticate
 * 3. Create a product with the seller
 * 4. Create a product variant
 * 5. Edit the variant 7 times to create 7 snapshots (initial create + 7 edits = 8 total states, but snapshots are created on edits)
 *
 * Test Execution:
 * 1. Retrieve first page of snapshots (page: 1, limit: 5)
 * 2. Verify pagination metadata and snapshot count
 * 3. Retrieve second page (page: 2, limit: 5)
 * 4. Verify remaining snapshots on second page
 * 5. Test DESC sorting (newest first)
 * 6. Test ASC sorting (oldest first)
 * 7. Verify timestamp ordering matches sort direction
 * 8. Verify no duplicates across pages
 */
export async function test_api_product_variant_snapshot_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Create product
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
  // 4. Create initial variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: ArrayUtil.repeat(2, () =>
            typia.random<string & tags.Format<"uuid">>(),
          ),
        } satisfies IShoppingMallProductVariant.ICreate,
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Edit variant 7 times to create snapshots
  const updateCount = 7;
  for (let i = 0; i < updateCount; i++) {
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: `SKU-EDIT-${i}-${RandomGenerator.alphaNumeric(4)}`,
          price_override: 1000 + i * 100,
          option_value_ids: ArrayUtil.repeat(2, () =>
            typia.random<string & tags.Format<"uuid">>(),
          ),
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  }
  // 6. Test pagination - Page 1 (limit: 5)
  const page1Response =
    await api.functional.shoppingMall.administrator.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 5,
          sort: { field: "created_at", order: "DESC" },
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(page1Response);
  // Verify first page has 5 snapshots
  TestValidator.equals("page 1 snapshot count", page1Response.data.length, 5);
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 5);
  TestValidator.equals(
    "page 1 total records",
    page1Response.pagination.records,
    updateCount,
  );
  TestValidator.equals("page 1 total pages", page1Response.pagination.pages, 2);
  // 7. Test pagination - Page 2 (limit: 5)
  const page2Response =
    await api.functional.shoppingMall.administrator.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 2,
          limit: 5,
          sort: { field: "created_at", order: "DESC" },
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(page2Response);
  // Verify second page has remaining 2 snapshots
  TestValidator.equals("page 2 snapshot count", page2Response.data.length, 2);
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 5);
  // 8. Verify no duplicates across pages
  const page1Ids = page1Response.data.map((s) => s.id);
  const page2Ids = page2Response.data.map((s) => s.id);
  const hasDuplicates = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate(
    "no duplicate snapshots across pages",
    !hasDuplicates,
  );
  // 9. Verify total snapshots across pages equals update count
  const totalSnapshots = page1Response.data.length + page2Response.data.length;
  TestValidator.equals(
    "total snapshots match updates",
    totalSnapshots,
    updateCount,
  );
  // 10. Test DESC sorting (newest first)
  const descResponse =
    await api.functional.shoppingMall.administrator.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: updateCount,
          sort: { field: "created_at", order: "DESC" },
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(descResponse);
  // Verify DESC order: each timestamp should be >= next timestamp
  for (let i = 0; i < descResponse.data.length - 1; i++) {
    const currentTime = new Date(descResponse.data[i].created_at).getTime();
    const nextTime = new Date(descResponse.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `DESC order: snapshot ${i} >= snapshot ${i + 1}`,
      currentTime >= nextTime,
    );
  }
  // 11. Test ASC sorting (oldest first)
  const ascResponse =
    await api.functional.shoppingMall.administrator.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: updateCount,
          sort: { field: "created_at", order: "ASC" },
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(ascResponse);
  // Verify ASC order: each timestamp should be <= next timestamp
  for (let i = 0; i < ascResponse.data.length - 1; i++) {
    const currentTime = new Date(ascResponse.data[i].created_at).getTime();
    const nextTime = new Date(ascResponse.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `ASC order: snapshot ${i} <= snapshot ${i + 1}`,
      currentTime <= nextTime,
    );
  }
  // 12. Verify first snapshot in DESC is same as last in ASC
  TestValidator.equals(
    "DESC first matches ASC last",
    descResponse.data[0].id,
    ascResponse.data[ascResponse.data.length - 1].id,
  );
  // 13. Verify last snapshot in DESC is same as first in ASC
  TestValidator.equals(
    "DESC last matches ASC first",
    descResponse.data[descResponse.data.length - 1].id,
    ascResponse.data[0].id,
  );
}
