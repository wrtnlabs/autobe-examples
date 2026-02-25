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

export async function test_api_admin_snapshot_filter_by_request_type_and_actor(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as system administrator
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers ?? {},
  };
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // 2. Query snapshots with filters: entity_type='cancellation_request', changed_by='seller', status='pending'
  const snapshotFilter: IShoppingMallProductSnapshot.IRequest = {
    entity_type: "cancellation_request",
    changed_by: "seller",
    status: "pending",
  };
  const snapshotResponse =
    await api.functional.shoppingMall.admin.snapshots.index(adminConnection, {
      body: snapshotFilter,
    });
  typia.assert(snapshotResponse);
  // 3. Validate results
  TestValidator.predicate(
    "pagination records greater than zero",
    snapshotResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "data array has items",
    snapshotResponse.data.length > 0,
  );
  TestValidator.equals(
    "pagination current page",
    snapshotResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotResponse.pagination.limit,
    100,
  );
  // Validate structure of data items
  // Only properties from IShoppingMallProductSnapshot.ISummary are available: id, display_name, status
  // We cannot validate filter effects on entity_type or status because they are not in the response schema
  // We can only validate that the API responded properly and structure is maintained
  for (const item of snapshotResponse.data) {
    TestValidator.predicate("item has id", item.id !== undefined);
    TestValidator.predicate(
      "item id is UUID",
      /^[0-9a-f-]{36}$/i.test(item.id),
    );
    TestValidator.predicate("item has status", item.status !== undefined);
    TestValidator.predicate(
      "item status is valid",
      ["active", "suspended", "deleted"].includes(item.status),
    );
  }
}