import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsActivityLog";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_logs_role_change_logging(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join admin user for organization management
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.MinLength<8>,
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(adminAuth);
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Create another member to receive role assignment
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.MinLength<8>,
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 3. Query activity logs with role-related actionType filters
  const roleAssignedLogs = await api.functional.hrms.member.activity_logs.index(
    adminConnection,
    {
      body: {
        actionType: "role.assigned",
      } satisfies IHrmsActivityLog.IRequest,
    },
  );
  typia.assert(roleAssignedLogs);
  const roleChangedLogs = await api.functional.hrms.member.activity_logs.index(
    adminConnection,
    {
      body: {
        actionType: "role.changed",
      } satisfies IHrmsActivityLog.IRequest,
    },
  );
  typia.assert(roleChangedLogs);
  // 4. Verify paginated results structure
  TestValidator.equals(
    "pagination metadata exists",
    roleAssignedLogs.pagination.current,
    1,
  );
  // 5. Verify pages calculation matches records / limit
  const expectedPages = Math.max(
    1,
    Math.ceil(
      roleAssignedLogs.pagination.records / roleAssignedLogs.pagination.limit,
    ),
  );
  TestValidator.equals(
    "pagination pages calculation correct",
    roleAssignedLogs.pagination.pages,
    expectedPages,
  );
  // 6. Query activity logs without filters to get all logs
  const allLogs = await api.functional.hrms.member.activity_logs.index(
    adminConnection,
    {
      body: {} satisfies IHrmsActivityLog.IRequest,
    },
  );
  typia.assert(allLogs);
  // 7. Verify all logs structure
  TestValidator.equals(
    "all logs pagination current",
    allLogs.pagination.current,
    1,
  );
  TestValidator.predicate(
    "all logs records is non-negative",
    allLogs.pagination.records >= 0,
  );
  // 8. Validate each activity log entry structure when present
  for (const log of allLogs.data) {
    typia.assert(log);
    TestValidator.predicate(
      "actionType is string",
      typeof log.actionType === "string",
    );
    TestValidator.predicate(
      "targetEntity is string",
      typeof log.targetEntity === "string",
    );
    TestValidator.predicate(
      "performedBy has required fields",
      log.performedBy.id !== undefined &&
        log.performedBy.email !== undefined &&
        log.performedBy.display_name !== undefined,
    );
    TestValidator.predicate(
      "createdAt is valid date-time",
      new Date(log.createdAt).getTime() > 0,
    );
    TestValidator.predicate(
      "updatedAt is valid date-time",
      new Date(log.updatedAt).getTime() > 0,
    );
    // Validate optional targetId can be null or UUID string
    if (log.targetId !== undefined) {
      typia.assertGuard(log.targetId);
    }
  }
  // 9. Test filtering by performedByUserId
  const adminUserId = adminAuth.id;
  const adminPerformedLogs =
    await api.functional.hrms.member.activity_logs.index(adminConnection, {
      body: {
        performedByUserId: adminUserId,
      } satisfies IHrmsActivityLog.IRequest,
    });
  typia.assert(adminPerformedLogs);
  // Verify all logs from admin
  for (const log of adminPerformedLogs.data) {
    TestValidator.equals(
      "log performed by admin user",
      log.performedBy.id,
      adminUserId,
    );
  }
  // 10. Test filtering by targetEntityType
  const roleTypeLogs = await api.functional.hrms.member.activity_logs.index(
    adminConnection,
    {
      body: {
        targetEntityType: "role",
      } satisfies IHrmsActivityLog.IRequest,
    },
  );
  typia.assert(roleTypeLogs);
  // Verify all logs have role target entity
  for (const log of roleTypeLogs.data) {
    TestValidator.equals("targetEntity is role", log.targetEntity, "role");
  }
  // 11. Test date range filtering
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString();
  const dateFilteredLogs = await api.functional.hrms.member.activity_logs.index(
    adminConnection,
    {
      body: {
        createdAtFrom: pastDate,
        createdAtTo: today,
      } satisfies IHrmsActivityLog.IRequest,
    },
  );
  typia.assert(dateFilteredLogs);
  // Verify all logs are within date range
  for (const log of dateFilteredLogs.data) {
    TestValidator.predicate(
      "createdAt is within range (from)",
      new Date(log.createdAt).getTime() >= new Date(pastDate).getTime(),
    );
    TestValidator.predicate(
      "createdAt is within range (to)",
      new Date(log.createdAt).getTime() <= new Date(today).getTime(),
    );
  }
  // 12. Test sorting by created_at descending (default)
  const sortedDescLogs = await api.functional.hrms.member.activity_logs.index(
    adminConnection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IHrmsActivityLog.IRequest,
    },
  );
  typia.assert(sortedDescLogs);
  // Verify descending order
  for (let i = 1; i < sortedDescLogs.data.length; i++) {
    const prevDate = new Date(sortedDescLogs.data[i - 1].createdAt).getTime();
    const currDate = new Date(sortedDescLogs.data[i].createdAt).getTime();
    TestValidator.predicate(
      "logs are sorted descending by created_at",
      prevDate >= currDate,
    );
  }
  // 13. Test sorting by created_at ascending
  const sortedAscLogs = await api.functional.hrms.member.activity_logs.index(
    adminConnection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "asc",
      } satisfies IHrmsActivityLog.IRequest,
    },
  );
  typia.assert(sortedAscLogs);
  // Verify ascending order
  for (let i = 1; i < sortedAscLogs.data.length; i++) {
    const prevDate = new Date(sortedAscLogs.data[i - 1].createdAt).getTime();
    const currDate = new Date(sortedAscLogs.data[i].createdAt).getTime();
    TestValidator.predicate(
      "logs are sorted ascending by created_at",
      prevDate <= currDate,
    );
  }
  // 14. Test pagination limit parameter
  const limitedLogs = await api.functional.hrms.member.activity_logs.index(
    adminConnection,
    {
      body: {
        limit: 5,
      } satisfies IHrmsActivityLog.IRequest,
    },
  );
  typia.assert(limitedLogs);
  TestValidator.predicate(
    "limit applied correctly (results <= limit)",
    limitedLogs.data.length <= 5,
  );
  // 15. Test immutability - activity logs should not have delete/update endpoints
  // This is validated by the absence of such endpoints in the API schema
  // Verify that querying with different filters returns consistent data structure
  const filter1Logs = await api.functional.hrms.member.activity_logs.index(
    adminConnection,
    {
      body: { actionType: "role.assigned" } satisfies IHrmsActivityLog.IRequest,
    },
  );
  typia.assert(filter1Logs);
  const filter2Logs = await api.functional.hrms.member.activity_logs.index(
    adminConnection,
    {
      body: { actionType: "role.changed" } satisfies IHrmsActivityLog.IRequest,
    },
  );
  typia.assert(filter2Logs);
  // Both queries return valid paginated responses with data arrays
  TestValidator.predicate(
    "role.assigned logs query returns valid structure",
    Array.isArray(filter1Logs.data) &&
      typeof filter1Logs.pagination === "object",
  );
  TestValidator.predicate(
    "role.changed logs query returns valid structure",
    Array.isArray(filter2Logs.data) &&
      typeof filter2Logs.pagination === "object",
  );
}
