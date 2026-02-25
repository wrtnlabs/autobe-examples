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

export async function test_api_admin_snapshot_filter_by_product_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create system administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminAuth);
  // 2. Query product snapshots with date filter
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const snapshotResponse =
    await api.functional.shoppingMall.admin.snapshots.index(adminConnection, {
      body: {
        entity_type: "product",
        from_date: today as string & tags.Format<"date">,
        to_date: tomorrow as string & tags.Format<"date">,
        page: 1,
        limit: 10,
      },
    });
  typia.assert(snapshotResponse);
  // 3. Validate pagination
  TestValidator.equals(
    "pagination current page",
    snapshotResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination has records",
    snapshotResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    snapshotResponse.pagination.pages >= 1,
  );
  // 4. Validate snapshot data structure
  TestValidator.predicate(
    "at least one product snapshot exists",
    snapshotResponse.data.length > 0,
  );
  // Validate each snapshot has correct structure from IPageIShoppingMallProductSnapshot.ISummary
  for (const snapshot of snapshotResponse.data) {
    // IPageIShoppingMallProductSnapshot.ISummary has properties: id, display_name, status
    // No entity_type property - this was a mistake based on IRequest
    TestValidator.equals("snapshot type", typeof snapshot.id, "string");
    TestValidator.predicate(
      "snapshot id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(snapshot.id),
    );
    TestValidator.predicate(
      "snapshot has valid status",
      ["active", "suspended", "deleted"].includes(snapshot.status),
    );
  }
}
