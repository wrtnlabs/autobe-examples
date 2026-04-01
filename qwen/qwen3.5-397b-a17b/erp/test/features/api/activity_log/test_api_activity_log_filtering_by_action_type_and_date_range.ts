import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test activity log filtering capabilities with action type and date range filters.
 *
 * This test validates the audit trail search functionality by:
 * 1. Authenticating as a member
 * 2. Creating activity-generating events (employee listing, project creation)
 * 3. Filtering activity logs by actionType
 * 4. Filtering by date range (dateFrom, dateTo)
 * 5. Combining actionType and date range filters
 * 6. Filtering by targetEntityType
 * 7. Verifying pagination metadata accuracy
 */
export async function test_api_activity_log_filtering_by_action_type_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create activity-generating events
  // Create a project to generate project-related activity log
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3366CC",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // List employees to generate employee-related activity
  const employees = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(employees);
  // Wait a small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Get initial activity logs (all)
  const allLogs = await api.functional.hrmPlatform.member.activity_logs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformActivityLog.IRequest,
    },
  );
  typia.assert(allLogs);
  // 4. Filter by actionType - project related
  const projectLogs =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
          actionType: "project.created",
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(projectLogs);
  TestValidator.predicate("project logs filtered by actionType", () => {
    return projectLogs.data.every(
      (log) => log.actionType === "project.created",
    );
  });
  TestValidator.predicate(
    "project logs count less than or equal to all logs",
    () => {
      return projectLogs.pagination.records <= allLogs.pagination.records;
    },
  );
  // 5. Filter by targetEntityType
  const employeeLogs =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
          targetEntityType: "employee",
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(employeeLogs);
  TestValidator.predicate("employee logs filtered by targetEntityType", () => {
    return employeeLogs.data.every(
      (log) => log.targetEntityType === "employee",
    );
  });
  // 6. Filter by date range
  const now = new Date();
  const dateTo = now.toISOString();
  const dateFrom = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 1 hour ago
  const dateFilteredLogs =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
          dateFrom,
          dateTo,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(dateFilteredLogs);
  TestValidator.predicate("date filtered logs within range", () => {
    return dateFilteredLogs.data.every((log) => {
      const logDate = new Date(log.createdAt);
      return logDate >= new Date(dateFrom) && logDate <= new Date(dateTo);
    });
  });
  // 7. Combine actionType and date range filters
  const combinedLogs =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
          actionType: "project.created",
          dateFrom,
          dateTo,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(combinedLogs);
  TestValidator.predicate("combined filter - actionType matches", () => {
    return combinedLogs.data.every(
      (log) => log.actionType === "project.created",
    );
  });
  TestValidator.predicate("combined filter - date range valid", () => {
    return combinedLogs.data.every((log) => {
      const logDate = new Date(log.createdAt);
      return logDate >= new Date(dateFrom) && logDate <= new Date(dateTo);
    });
  });
  TestValidator.predicate(
    "combined filter count less than or equal to actionType only",
    () => {
      return combinedLogs.pagination.records <= projectLogs.pagination.records;
    },
  );
  // 8. Verify pagination metadata
  TestValidator.predicate("pagination current page is 1", () => {
    return allLogs.pagination.current === 1;
  });
  TestValidator.predicate("pagination limit matches request", () => {
    return allLogs.pagination.limit === 100;
  });
  TestValidator.predicate("pagination records count valid", () => {
    return allLogs.pagination.records >= 0;
  });
  TestValidator.predicate("pagination pages calculated correctly", () => {
    const expectedPages = Math.ceil(
      allLogs.pagination.records / allLogs.pagination.limit,
    );
    return (
      allLogs.pagination.pages === expectedPages ||
      allLogs.pagination.pages === 0
    );
  });
}
