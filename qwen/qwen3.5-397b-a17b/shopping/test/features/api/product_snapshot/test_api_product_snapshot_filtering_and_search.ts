import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test administrator product snapshot filtering and search capabilities.
 *
 * This test validates that administrators can:
 * 1. Filter product snapshots by date range (snapshotAtFrom/snapshotAtTo)
 * 2. Search snapshots by product name (partial match)
 * 3. Navigate paginated results with correct metadata
 * 4. Sort snapshots by various fields in ascending/descending order
 *
 * Test flow:
 * - Admin authentication
 * - Seller account creation and approval
 * - Product creation
 * - Multiple product edits to generate snapshots
 * - Snapshot filtering and search validation
 */
export async function test_api_product_snapshot_filtering_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Create initial product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Initial Product Name",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Edit product multiple times to create snapshots with different names
  const editNames = [
    "Updated Product Alpha",
    "Modified Product Beta",
    "Changed Product Gamma",
    "Final Product Delta",
  ];
  for (const name of editNames) {
    const updatedProduct =
      await api.functional.shoppingMall.seller.products.update(
        sellerConnection,
        {
          productId: product.id,
          body: {
            name: name,
          } satisfies IShoppingMallProduct.IUpdate,
        },
      );
    typia.assert(updatedProduct);
    // Wait briefly to ensure distinct timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  // 5. Test date range filtering
  const now = new Date();
  const fromDate = new Date(now.getTime() - 60000); // 1 minute ago
  const toDate = new Date(now.getTime() + 60000); // 1 minute ahead
  const dateFilteredResponse =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          snapshotAtFrom: fromDate.toISOString(),
          snapshotAtTo: toDate.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(dateFilteredResponse);
  // Verify pagination metadata
  TestValidator.predicate(
    "has pagination",
    dateFilteredResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    dateFilteredResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 20",
    dateFilteredResponse.pagination.limit === 20,
  );
  TestValidator.predicate(
    "has data array",
    dateFilteredResponse.data.length > 0,
  );
  // Verify all snapshots are within date range
  for (const snapshot of dateFilteredResponse.data) {
    TestValidator.predicate(
      "snapshot_at within range",
      snapshot.snapshot_at >= fromDate.toISOString() &&
        snapshot.snapshot_at <= toDate.toISOString(),
    );
  }
  // 6. Test name search filtering
  const searchTerm = "Product";
  const nameSearchResponse =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          name: searchTerm,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(nameSearchResponse);
  TestValidator.predicate(
    "name search returns data",
    nameSearchResponse.data.length > 0,
  );
  // Verify all returned snapshots contain search term in name
  for (const snapshot of nameSearchResponse.data) {
    TestValidator.predicate(
      "name contains search term",
      snapshot.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }
  // 7. Test pagination with different limits
  const smallLimitResponse =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(smallLimitResponse);
  TestValidator.predicate(
    "limit is 2",
    smallLimitResponse.pagination.limit === 2,
  );
  TestValidator.predicate(
    "data length matches limit",
    smallLimitResponse.data.length <= 2,
  );
  // 8. Test sorting by snapshot_at descending
  const sortedDescResponse =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
          sort: "snapshot_at,desc",
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(sortedDescResponse);
  TestValidator.predicate(
    "sorted desc has data",
    sortedDescResponse.data.length > 0,
  );
  // Verify descending order (later snapshots first)
  if (sortedDescResponse.data.length >= 2) {
    TestValidator.predicate(
      "first snapshot is newer than second",
      sortedDescResponse.data[0].snapshot_at >=
        sortedDescResponse.data[1].snapshot_at,
    );
  }
  // 9. Test sorting by snapshot_at ascending
  const sortedAscResponse =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
          sort: "snapshot_at,asc",
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(sortedAscResponse);
  TestValidator.predicate(
    "sorted asc has data",
    sortedAscResponse.data.length > 0,
  );
  // Verify ascending order (earlier snapshots first)
  if (sortedAscResponse.data.length >= 2) {
    TestValidator.predicate(
      "first snapshot is older than second",
      sortedAscResponse.data[0].snapshot_at <=
        sortedAscResponse.data[1].snapshot_at,
    );
  }
  // 10. Test sorting by name
  const nameSortedResponse =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
          sort: "name,asc",
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(nameSortedResponse);
  TestValidator.predicate(
    "name sorted has data",
    nameSortedResponse.data.length > 0,
  );
}
