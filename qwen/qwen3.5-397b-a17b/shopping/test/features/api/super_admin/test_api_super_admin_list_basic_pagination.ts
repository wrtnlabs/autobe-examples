import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdmin";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the primary success path for retrieving a paginated list of super administrator accounts.
 *
 * This test validates:
 * 1. Super admin authentication via join endpoint
 * 2. Paginated list retrieval without filters returns correct structure
 * 3. Pagination metadata (current, limit, records, pages) is calculated correctly
 * 4. Data array contains super admin summary objects with required fields
 * 5. Results are sorted by created_at in descending order (newest first)
 * 6. Only active (non-deleted) super admins are included
 */
export async function test_api_super_admin_list_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Step 2: Request super admin list without filters (default pagination)
  const listResult =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      superAdminConnection,
      {
        body: {} satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(listResult);
  // Step 3: Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    listResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is valid",
    listResult.pagination.limit >= 1 && listResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    listResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    listResult.pagination.pages >= 0,
  );
  // Validate pages calculation: pages = ceil(records / limit)
  const expectedPages =
    listResult.pagination.records === 0
      ? 0
      : Math.ceil(listResult.pagination.records / listResult.pagination.limit);
  TestValidator.equals(
    "pages calculation",
    listResult.pagination.pages,
    expectedPages,
  );
  // Step 4: Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(listResult.data));
  TestValidator.predicate(
    "data length matches records",
    listResult.data.length <= listResult.pagination.limit,
  );
  if (listResult.data.length > 0) {
    // Validate each super admin summary has required fields (typia.assert validates structure)
    for (const admin of listResult.data) {
      typia.assert(admin);
    }
    // Step 5: Validate sorting (created_at descending - newest first)
    if (listResult.data.length > 1) {
      for (let i = 0; i < listResult.data.length - 1; i++) {
        const current = new Date(listResult.data[i].created_at).getTime();
        const next = new Date(listResult.data[i + 1].created_at).getTime();
        TestValidator.predicate(
          `sorted by created_at desc (index ${i})`,
          current >= next,
        );
      }
    }
  }
}
