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

export async function test_api_admin_snapshot_pagination_multiple_pages(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Update the connection with authentication token
  adminConnection.headers = { Authorization: `Bearer ${admin.access_token}` };
  // First page: retrieve initial set of snapshots
  const firstPage: IPageIShoppingMallProductSnapshot.ISummary =
    await api.functional.shoppingMall.admin.snapshots.index(adminConnection, {
      body: { limit: 25, entity_type: "product" } satisfies IShoppingMallProductSnapshot.IRequest,
    });
  typia.assert(firstPage);
  // Verify first page has data and pagination is correct
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 25);
  TestValidator.predicate(
    "first page has records",
    firstPage.pagination.records > 0,
  );
  TestValidator.equals(
    "first page returns exactly 25 records",
    firstPage.data.length,
    25,
  );
  // Second page: request next page using page=2
  const secondPage: IPageIShoppingMallProductSnapshot.ISummary =
    await api.functional.shoppingMall.admin.snapshots.index(adminConnection, {
      body: {
        page: 2,
        limit: 25,
        entity_type: "product",
      } satisfies IShoppingMallProductSnapshot.IRequest,
    });
  typia.assert(secondPage);
  // Verify second page pagination structure
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 25);
  TestValidator.predicate(
    "second page has records",
    secondPage.pagination.records > 25,
  );
  TestValidator.equals(
    "second page returns exactly 25 records",
    secondPage.data.length,
    25,
  );
  // Verify the second page does not contain any records from the first page
  // Using ID tracking to detect duplicates
  const firstPageIds = firstPage.data.map((item) => item.id);
  // Verify no duplicates between pages (no overlap)
  secondPage.data.forEach((item) => {
    TestValidator.notEquals(
      "no duplicate snapshot ID across pages",
      firstPageIds.includes(item.id),
      true,
    );
  });
  // Validate that all snapshot items have correct structure
  // Only these fields exist in IShoppingMallProductSnapshot.ISummary
  firstPage.data.forEach((snapshot) => {
    TestValidator.predicate("snapshot has id", snapshot.id !== undefined);
    TestValidator.predicate(
      "snapshot id is uuid",
      /^[0-9a-f-]{36}$/i.test(snapshot.id),
    );
    TestValidator.predicate(
      "snapshot has status",
      snapshot.status !== undefined,
    );
    TestValidator.predicate(
      "status is one of valid values",
      ["active", "suspended", "deleted"].includes(snapshot.status),
    );
    // display_name is optional
  });
  secondPage.data.forEach((snapshot) => {
    TestValidator.predicate("snapshot has id", snapshot.id !== undefined);
    TestValidator.predicate(
      "snapshot id is uuid",
      /^[0-9a-f-]{36}$/i.test(snapshot.id),
    );
    TestValidator.predicate(
      "snapshot has status",
      snapshot.status !== undefined,
    );
    TestValidator.predicate(
      "status is one of valid values",
      ["active", "suspended", "deleted"].includes(snapshot.status),
    );
  });
}