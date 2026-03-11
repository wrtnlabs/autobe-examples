import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformAdminAuditLog";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminAuditLog";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_filtering_actions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as first admin and perform an action that creates audit logs
  const adminConnection1: api.IConnection = { host: connection.host };
  const adminResult1 = await authorize_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(12),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminResult1);
  const adminId1 = adminResult1.id;
  // 2. Create another admin to test filtering by adminIds
  const adminConnection2: api.IConnection = { host: connection.host };
  const adminResult2 = await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(12),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminResult2);
  const adminId2 = adminResult2.id;
  // 3. Record timestamps for date range filtering
  const beforeTimestamp = new Date().toISOString();
  const afterTimestamp = new Date().toISOString();
  // 4. Query audit logs with no filters to get baseline
  const baselineFilter: IRedditPlatformAdminAuditLog.IRequest = {
    page: 1,
    limit: 20,
  };
  const baselineResult =
    await api.functional.redditPlatform.admin.audit_logs.index(
      adminConnection1,
      { body: baselineFilter },
    );
  typia.assert(baselineResult);
  // 5. Test filtering by actionTypes
  const actionTypeFilter: IRedditPlatformAdminAuditLog.IRequest = {
    actionTypes: ["USER_SUSPEND"],
    page: 1,
    limit: 20,
  };
  const actionTypesResult =
    await api.functional.redditPlatform.admin.audit_logs.index(
      adminConnection1,
      { body: actionTypeFilter },
    );
  typia.assert(actionTypesResult);
  // 6. Test filtering by adminIds
  const adminIdsFilter: IRedditPlatformAdminAuditLog.IRequest = {
    adminIds: [adminId1],
    page: 1,
    limit: 20,
  };
  const adminIdsResult =
    await api.functional.redditPlatform.admin.audit_logs.index(
      adminConnection1,
      { body: adminIdsFilter },
    );
  typia.assert(adminIdsResult);
  // 7. Test filtering by date range
  const dateRangeFilter: IRedditPlatformAdminAuditLog.IRequest = {
    startDate: beforeTimestamp,
    endDate: afterTimestamp,
    page: 1,
    limit: 20,
  };
  const dateRangeResult =
    await api.functional.redditPlatform.admin.audit_logs.index(
      adminConnection1,
      { body: dateRangeFilter },
    );
  typia.assert(dateRangeResult);
  // 8. Test combined filtering
  const combinedFilter: IRedditPlatformAdminAuditLog.IRequest = {
    adminIds: [adminId1],
    actionTypes: ["USER_SUSPEND"],
    startDate: beforeTimestamp,
    endDate: afterTimestamp,
    page: 1,
    limit: 20,
  };
  const combinedResult =
    await api.functional.redditPlatform.admin.audit_logs.index(
      adminConnection1,
      { body: combinedFilter },
    );
  typia.assert(combinedResult);
  // 9. Validate pagination limit is respected
  TestValidator.equals(
    "pagination limit respected",
    combinedResult.pagination.limit,
    combinedFilter.limit,
  );
  // 10. Validate pagination current page
  TestValidator.equals(
    "pagination current page",
    combinedResult.pagination.current,
    combinedFilter.page,
  );
  // 11. Validate pagination records count
  TestValidator.predicate(
    "pagination records >= 0",
    combinedResult.pagination.records >= 0,
  );
  // 12. Validate pagination pages calculation
  TestValidator.predicate(
    "pagination pages >= 0",
    combinedResult.pagination.pages >= 0,
  );
}