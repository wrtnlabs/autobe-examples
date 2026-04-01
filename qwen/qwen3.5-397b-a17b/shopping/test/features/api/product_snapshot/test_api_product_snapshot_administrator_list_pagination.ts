import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator's ability to retrieve paginated product snapshots for platform oversight.
 *
 * This test validates:
 * 1. Administrator authentication and access to product snapshot endpoint
 * 2. Pagination metadata structure and accuracy
 * 3. Snapshot data integrity with required fields
 * 4. Product and category reference population
 * 5. Multi-page retrieval functionality
 * 6. Snapshots sorted by created_at descending (newest first)
 */
export async function test_api_product_snapshot_administrator_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
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
  // 2. Generate product UUID for testing
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve first page of product snapshots
  const firstPage =
    await api.functional.shoppingMall.administrator.products.snapshots.index(
      adminConnection,
      {
        productId: productId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    firstPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    firstPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  // 5. Validate snapshots array exists
  TestValidator.predicate(
    "snapshots data is array",
    Array.isArray(firstPage.data),
  );
  // 6. Validate snapshot business logic (type validation done by typia.assert)
  for (const snapshot of firstPage.data) {
    // Business logic: snapshot name should not be empty
    TestValidator.predicate(
      "snapshot name is not empty",
      snapshot.name.trim().length > 0,
    );
    // Business logic: base price should be positive
    TestValidator.predicate(
      "snapshot base_price is positive",
      snapshot.base_price > 0,
    );
    // Business logic: product price range should be valid
    TestValidator.predicate(
      "product min price is non-negative",
      snapshot.product.min >= 0,
    );
    TestValidator.predicate(
      "product max price is at least min",
      snapshot.product.max >= snapshot.product.min,
    );
    // Business logic: category name should not be empty
    TestValidator.predicate(
      "category name is not empty",
      snapshot.category.name.trim().length > 0,
    );
    // Business logic: category parent validation
    if (snapshot.category.parent !== null) {
      TestValidator.predicate(
        "category parent name is not empty",
        snapshot.category.parent.name.trim().length > 0,
      );
    }
  }
  // 7. Request second page to verify pagination works
  const secondPage =
    await api.functional.shoppingMall.administrator.products.snapshots.index(
      adminConnection,
      {
        productId: productId,
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(secondPage);
  // 8. Validate second page pagination metadata
  TestValidator.equals(
    "second page current page",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit consistent",
    secondPage.pagination.limit,
    firstPage.pagination.limit,
  );
  // 9. Validate snapshots are sorted by created_at descending (newest first)
  if (firstPage.data.length > 1) {
    for (let i = 1; i < firstPage.data.length; i++) {
      const prevDate = new Date(firstPage.data[i - 1].created_at).getTime();
      const currDate = new Date(firstPage.data[i].created_at).getTime();
      TestValidator.predicate(
        `snapshots sorted by created_at descending at index ${i}`,
        prevDate >= currDate,
      );
    }
  }
}
