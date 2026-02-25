import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_product_snapshot_pagination_and_ordering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Use a random productId - we cannot create products with available functions,
  // so we test the pagination endpoint with a random ID that may or may not have snapshots
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve first page of snapshots (page=1, limit=10)
  // The API endpoint accepts pagination via query parameters, so we construct the URL explicitly
  const firstPageUrl =
    api.functional.shoppingMall.admin.products.snapshots.at.path({
      productId,
    }) + "?page=1&limit=10";
  const firstPageConnection: api.IConnection = { host: firstPageUrl };
  const firstPage =
    await api.functional.shoppingMall.admin.products.snapshots.at(
      firstPageConnection,
      { productId },
    );
  typia.assert(firstPage);
  // 4. Validate first page pagination metadata structure
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "first page records is non-negative",
    () => firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages is non-negative",
    () => firstPage.pagination.pages >= 0,
  );
  // 5. Validate data structure and version ordering
  // If no snapshots exist, data array will be empty but metadata still valid
  if (firstPage.data.length > 0) {
    // Validate snapshot data structure
    firstPage.data.forEach((snapshot) => {
      typia.assert(snapshot);
    });
    // Verify data is ordered by version DESC (newest first)
    for (let i = 0; i < firstPage.data.length - 1; i++) {
      TestValidator.predicate(
        "version descending",
        () => firstPage.data[i].version > firstPage.data[i + 1].version,
      );
    }
  }
  // 6. Retrieve second page of snapshots (page=2, limit=10)
  // Construct URL with different pagination parameters
  const secondPageUrl =
    api.functional.shoppingMall.admin.products.snapshots.at.path({
      productId,
    }) + "?page=2&limit=10";
  const secondPageConnection: api.IConnection = { host: secondPageUrl };
  const secondPage =
    await api.functional.shoppingMall.admin.products.snapshots.at(
      secondPageConnection,
      { productId },
    );
  typia.assert(secondPage);
  // 7. Validate second page pagination metadata structure
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
  TestValidator.predicate(
    "second page records is non-negative",
    () => secondPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "second page pages is non-negative",
    () => secondPage.pagination.pages >= 0,
  );
  // 8. Validate data structure and version ordering on second page
  if (secondPage.data.length > 0) {
    // Validate snapshot data structure
    secondPage.data.forEach((snapshot) => {
      typia.assert(snapshot);
    });
    // Verify data is ordered by version DESC (newest first)
    for (let i = 0; i < secondPage.data.length - 1; i++) {
      TestValidator.predicate(
        "second page version descending",
        () => secondPage.data[i].version > secondPage.data[i + 1].version,
      );
    }
  }
  // 9. Validate pagination continuity (if both pages have data)
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    // The last item of first page should have higher version than first item of second page
    TestValidator.predicate("pagination continuity", () => {
      return (
        firstPage.data[firstPage.data.length - 1].version >
        secondPage.data[0].version
      );
    });
  }
  // 10. Validate that pages do not overlap - no duplication of version numbers
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    const versionsFirstPage = firstPage.data.map((s) => s.version);
    const versionsSecondPage = secondPage.data.map((s) => s.version);
    for (const v1 of versionsFirstPage) {
      TestValidator.predicate(
        "no version duplication",
        () => !versionsSecondPage.includes(v1),
      );
    }
  }
}
