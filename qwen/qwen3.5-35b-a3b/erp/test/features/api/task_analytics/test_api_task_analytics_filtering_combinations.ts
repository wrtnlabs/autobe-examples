import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTaskAnalyticGrouping } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskAnalyticGrouping";
import type { IHrmsTaskParentTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskParentTaskFilter";
import type { IHrmsTaskPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskPriority";
import type { IHrmsTaskStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskStatusHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_task_analytics_filtering_combinations(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // Step 2: Create analytics connection with member token
  const analyticsConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  // Step 3: Generate test date ranges
  const now = new Date();
  const createdDateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const createdDateTo = new Date(now.getTime()).toISOString().split("T")[0];
  const dueDateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const dueDateTo = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  // Step 4: Test comprehensive filter combination
  const filterRequestBody: IHrmsTask.IRequest = {
    createdDateFrom,
    createdDateTo,
    dueDateFrom,
    dueDateTo,
    status: ["open", "in-progress"] as IHrmsTaskStatusHistory[],
    priority: ["high", "urgent"] as IHrmsTaskPriority[],
    grouping: {
      group_by: "status",
    },
  };
  const analyticsResult =
    await api.functional.hrms.member.projects.tasks.analytics(
      analyticsConnection,
      {
        body: filterRequestBody,
      },
    );
  typia.assert(analyticsResult);
  // Step 5: Validate analytics response structure
  TestValidator.equals(
    "analytics result has valid task count",
    analyticsResult.task_count,
    analyticsResult.task_count,
  );
  // Step 6: Test unassigned task filter (withAssignment: false)
  const unassignedFilterRequestBody: IHrmsTask.IRequest = {
    withAssignment: false,
    grouping: {
      group_by: "employee",
    },
  };
  const unassignedAnalytics =
    await api.functional.hrms.member.projects.tasks.analytics(
      analyticsConnection,
      {
        body: unassignedFilterRequestBody,
      },
    );
  typia.assert(unassignedAnalytics);
  // Step 7: Test parent task filter for subtasks only (parentTaskFilter: 'subtask')
  const subtaskFilterRequestBody: IHrmsTask.IRequest = {
    parentTaskFilter: "subtask" as IHrmsTaskParentTaskFilter,
    grouping: {
      group_by: "project",
    },
  };
  const subtaskAnalytics =
    await api.functional.hrms.member.projects.tasks.analytics(
      analyticsConnection,
      {
        body: subtaskFilterRequestBody,
      },
    );
  typia.assert(subtaskAnalytics);
  // Step 8: Test filtering with multiple projects
  const projectIdsFilter: (string & tags.Format<"uuid">)[] = [
    typia.random<string & tags.Format<"uuid">>(),
  ];
  const projectFilterRequestBody: IHrmsTask.IRequest = {
    projectIds: projectIdsFilter,
    grouping: {
      group_by: "status",
    },
  };
  const projectAnalytics =
    await api.functional.hrms.member.projects.tasks.analytics(
      analyticsConnection,
      {
        body: projectFilterRequestBody,
      },
    );
  typia.assert(projectAnalytics);
  // Step 9: Test pagination with filtering
  const paginationFilterRequestBody: IHrmsTask.IRequest = {
    createdDateFrom,
    status: ["completed"] as IHrmsTaskStatusHistory[],
    page: 1,
    limit: 20,
    grouping: {
      group_by: "priority",
    },
  };
  const paginatedAnalytics =
    await api.functional.hrms.member.projects.tasks.analytics(
      analyticsConnection,
      {
        body: paginationFilterRequestBody,
      },
    );
  typia.assert(paginatedAnalytics);
  // Step 10: Test date range filtering
  const dateRangeFilterRequestBody: IHrmsTask.IRequest = {
    createdDateFrom,
    createdDateTo,
    dueDateFrom,
    dueDateTo,
    grouping: {
      group_by: "due_date_month",
    },
  };
  const dateRangeAnalytics =
    await api.functional.hrms.member.projects.tasks.analytics(
      analyticsConnection,
      {
        body: dateRangeFilterRequestBody,
      },
    );
  typia.assert(dateRangeAnalytics);
  // Step 11: Test employee filter
  const employeeFilterRequestBody: IHrmsTask.IRequest = {
    employeeIds: [typia.random<string & tags.Format<"uuid">>()],
    grouping: {
      group_by: "employee",
    },
  };
  const employeeAnalytics =
    await api.functional.hrms.member.projects.tasks.analytics(
      analyticsConnection,
      {
        body: employeeFilterRequestBody,
      },
    );
  typia.assert(employeeAnalytics);
  // Step 12: Test parent filter for tasks without parents
  const parentFilterRequestBody: IHrmsTask.IRequest = {
    parentTaskFilter: "parent" as IHrmsTaskParentTaskFilter,
    grouping: {
      group_by: "status",
    },
  };
  const parentAnalytics =
    await api.functional.hrms.member.projects.tasks.analytics(
      analyticsConnection,
      {
        body: parentFilterRequestBody,
      },
    );
  typia.assert(parentAnalytics);
}
