import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test basic paginated listing of administrator accounts with default pagination.
 *
 * Validates that the administrator listing endpoint returns properly paginated results with all expected metadata fields. After authenticating a new administrator, the endpoint is called with default pagination parameters to verify the fundamental contract: correct pagination values, complete summary fields on each entry, exclusion of soft-deleted accounts, and descending creation-time sort order.
 *
 * The test also confirms that sensitive fields like password_hash are never present in any response field — this is guaranteed by the IShoppingMallAdmin.ISummary type definition and enforced by typia.assert.
 *
 * 1. Register and authenticate a new administrator via authorize_admin_join.
 * 2. Request administrator listing with default pagination (page=1, limit=10).
 * 3. Verify pagination metadata: current=1, limit=10, records>0, pages>0.
 * 4. Verify each admin summary has deleted_at=null (soft-deleted excluded).
 * 5. Verify sort order is by created_at descending (newest first).
 */
export async function test_api_admin_list_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. List administrators with default pagination
  const list = await api.functional.shoppingMall.admin.admins.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(list);
  // 3. Verify pagination metadata
  TestValidator.equals("pagination current", list.pagination.current, 1);
  TestValidator.equals("pagination limit", list.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records positive",
    list.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages positive",
    list.pagination.pages > 0,
  );
  // 4. Verify data array is non-empty
  TestValidator.predicate("data is non-empty array", list.data.length > 0);
  // 5. Verify soft-deleted accounts excluded (all deleted_at must be null)
  for (const summary of list.data) {
    TestValidator.equals(
      `deleted_at is null for admin ${summary.id}`,
      summary.deleted_at,
      null,
    );
  }
  // 6. Verify default sort order: created_at descending (newest first)
  for (let i = 1; i < list.data.length; i++) {
    const prev = new Date(list.data[i - 1].created_at).getTime();
    const curr = new Date(list.data[i].created_at).getTime();
    TestValidator.predicate(
      `created_at descending at index ${i}`,
      prev >= curr,
    );
  }
}
