import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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

export async function test_api_product_snapshot_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Create a product to have snapshots
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Test 1: Default pagination (no parameters)
  const defaultPage =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(defaultPage);
  // Verify default pagination values
  TestValidator.equals("default page is 1", defaultPage.pagination.current, 1);
  TestValidator.equals("default limit is 20", defaultPage.pagination.limit, 20);
  TestValidator.predicate(
    "records is non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    defaultPage.pagination.pages >= 0,
  );
  // Test 2: Custom pagination parameters
  const customPage =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(customPage);
  TestValidator.equals("custom page is 1", customPage.pagination.current, 1);
  TestValidator.equals("custom limit is 5", customPage.pagination.limit, 5);
  // Test 3: Page beyond available data
  const beyondPage =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 999,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals(
    "page beyond data returns empty array",
    beyondPage.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page number preserved",
    beyondPage.pagination.current,
    999,
  );
  TestValidator.equals(
    "beyond page limit preserved",
    beyondPage.pagination.limit,
    10,
  );
  // Test 4: Maximum limit (100)
  const maxLimitPage =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals("max limit is 100", maxLimitPage.pagination.limit, 100);
  // Test 5: Verify pagination metadata consistency
  const totalPages = defaultPage.pagination.pages;
  const totalRecords = defaultPage.pagination.records;
  if (totalRecords > 0) {
    // Verify pages calculation: pages = ceil(records / limit)
    const expectedPages = Math.ceil(totalRecords / 20);
    TestValidator.equals(
      "pages calculated correctly",
      defaultPage.pagination.pages,
      expectedPages,
    );
    // Verify data count does not exceed limit
    TestValidator.predicate(
      "data count within limit",
      defaultPage.data.length <= 20,
    );
  }
  // Test 6: Verify pagination consistency across requests
  TestValidator.equals(
    "total records consistent across requests",
    defaultPage.pagination.records,
    customPage.pagination.records,
  );
  TestValidator.equals(
    "total pages consistent across requests",
    defaultPage.pagination.pages,
    customPage.pagination.pages,
  );
}
