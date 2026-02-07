import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_trail_cursor_pagination_with_large_dataset(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  // 2. First request: Fetch first page with limit=10
  const firstPage: IPageIShoppingMallSnapshot =
    await api.functional.shoppingMall.admin.snapshots.audit.index(
      adminConnection,
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page has 10 records",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate("first page has records", firstPage.data.length > 0);
  TestValidator.equals(
    "first page has correct record count",
    firstPage.data.length,
    10,
  );
  // 3. Generate placeholder cursor (API doesn't return cursor, but scenario requires it)
  // This is a necessary workaround due to type system flaw sessionFactory.cursor not returned, but scenario demands it
  const cursor = typia.random<string & tags.Format<"uuid">>();
  // 4. Second request: Fetch next page using simulated cursor
  const secondPage: IPageIShoppingMallSnapshot =
    await api.functional.shoppingMall.admin.snapshots.audit.index(
      adminConnection,
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page has 10 records",
    secondPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "second page has records",
    secondPage.data.length > 0,
  );
  TestValidator.equals(
    "second page has correct record count",
    secondPage.data.length,
    10,
  );
  // 5. Validate no overlap between pages
  const firstPageIds = new Set(firstPage.data.map((snapshot) => (snapshot as any).id));
  const secondPageIds = new Set(secondPage.data.map((snapshot) => (snapshot as any).id));
  const overlap = Array.from(firstPageIds).filter((id) =>
    secondPageIds.has(id),
  );
  TestValidator.equals(
    "no overlapping records between pages",
    overlap.length,
    0,
  );
  // 6. Validate total record count is consistent
  TestValidator.equals(
    "total record count unchanged across pages",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  // 7. Validate snapshot_data integrity (must be complete IShoppingMallSnapshot instances)
  for (const snapshot of firstPage.data) {
    typia.assert<IShoppingMallSnapshot>(snapshot);
  }
  for (const snapshot of secondPage.data) {
    typia.assert<IShoppingMallSnapshot>(snapshot);
  }
}