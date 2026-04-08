import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator audit logs retrieval with pagination.
 *
 * Validates the complete audit log retrieval flow including administrator authentication, paginated query execution, and response structure validation. Ensures that audit logs contain all required fields and pagination metadata is accurate.
 *
 * Special attention is given to verifying that audit log entries include administrator information, pagination boundaries are correctly calculated, and multiple page requests return consistent results.
 *
 * 1. Administrator account is created and authenticated using authorize_admin_join utility.
 * 2. First page of audit logs is retrieved with default pagination parameters.
 * 3. Response structure is validated including pagination metadata and audit log entries.
 * 4. Each audit log entry is verified to contain all required fields including admin summary.
 * 5. Second page is requested to verify pagination functionality works correctly.
 * 6. Pagination metadata consistency is validated across both page requests.
 */
export async function test_api_admin_audit_logs_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve first page of audit logs
  const firstPage =
    await api.functional.shoppingMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(firstPage);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    firstPage.pagination.current === 1,
  );
  TestValidator.predicate("limit is 20", firstPage.pagination.limit === 20);
  TestValidator.predicate(
    "records count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  // 4. Validate audit log entries exist as array
  TestValidator.predicate("data is array", Array.isArray(firstPage.data));
  // 5. Retrieve second page to verify pagination
  const secondPage =
    await api.functional.shoppingMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(secondPage);
  // 6. Validate second page pagination metadata consistency
  TestValidator.predicate(
    "second page current is 2 or 1 if no more data",
    secondPage.pagination.current === 2 || secondPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "second page limit is 20",
    secondPage.pagination.limit === 20,
  );
  TestValidator.equals(
    "total records consistent",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "total pages consistent",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );
  // 7. Validate chronological ordering (createdAt descending)
  if (firstPage.data.length > 1) {
    for (let i = 0; i < firstPage.data.length - 1; i++) {
      const currentLog = firstPage.data[i];
      const nextLog = firstPage.data[i + 1];
      TestValidator.predicate(
        `logs sorted by createdAt descending at index ${i}`,
        new Date(currentLog.createdAt).getTime() >=
          new Date(nextLog.createdAt).getTime(),
      );
    }
  }
}
