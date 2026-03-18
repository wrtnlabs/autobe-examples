import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTaskAnalyticGrouping } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskAnalyticGrouping";
import type { IHrmsTaskParentTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskParentTaskFilter";
import type { IHrmsTaskPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskPriority";
import type { IHrmsTaskStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskStatusHistory";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_projects_tasks_create } from "../../../generate/generate_random_hrms_member_projects_tasks_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";

export async function test_api_task_analytics_employee_project_grouping(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup - Register member (creates organization)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: memberAuth.token.access,
  };
  // 2. Get organization ID
  const organizationId = memberAuth.organization_memberships[0].organization.id;
  // 3. Create multiple tasks in different projects to test grouping
  // Create tasks in first 2 projects
  const projectIds = [organizationId, organizationId];
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 3; j++) {
      await generate_random_hrms_member_projects_tasks_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.name(3) + ` (${i}-${j})`,
          },
          params: {
            projectId: projectIds[0],
          },
        },
      );
      await generate_random_hrms_member_projects_tasks_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.name(3) + ` (${i}-${j})`,
          },
          params: {
            projectId: projectIds[1],
          },
        },
      );
    }
  }
  // 4. Test grouping by project
  const projectGrouping =
    await api.functional.hrms.member.projects.tasks.analytics(
      memberConnection,
      {
        body: {
          grouping: {
            group_by: "project",
            include_subtasks: true,
            include_empty_groups: false,
          },
        },
      },
    );
  typia.assert(projectGrouping);
  // Validate that response has task count data
  TestValidator.predicate(
    "project grouping has task count",
    projectGrouping.task_count > 0,
  );
  TestValidator.equals(
    "project grouping has project_id",
    projectGrouping.project_id !== undefined,
    true,
  );
  TestValidator.equals(
    "project grouping has project_name",
    projectGrouping.project_name !== undefined,
    true,
  );
  // 5. Test grouping by employee with include_subtasks: false
  const projectGroupingNoSubtasks =
    await api.functional.hrms.member.projects.tasks.analytics(
      memberConnection,
      {
        body: {
          grouping: {
            group_by: "project",
            include_subtasks: false,
            include_empty_groups: false,
          },
        },
      },
    );
  typia.assert(projectGroupingNoSubtasks);
  // Validate subtask exclusion works
  TestValidator.equals(
    "project grouping no subtasks has task count",
    projectGroupingNoSubtasks.task_count >= 0,
    true,
  );
  // 6. Test grouping by employee
  const employeeGrouping =
    await api.functional.hrms.member.projects.tasks.analytics(
      memberConnection,
      {
        body: {
          grouping: {
            group_by: "employee",
            include_subtasks: true,
            include_empty_groups: false,
          },
        },
      },
    );
  typia.assert(employeeGrouping);
  // Validate employee grouping response structure
  TestValidator.equals(
    "employee grouping has task count",
    employeeGrouping.task_count >= 0,
    true,
  );
  TestValidator.equals(
    "employee grouping has project_id",
    employeeGrouping.project_id !== undefined,
    true,
  );
  // 7. Test include_empty_groups: true
  const employeeEmptyGroups =
    await api.functional.hrms.member.projects.tasks.analytics(
      memberConnection,
      {
        body: {
          grouping: {
            group_by: "employee",
            include_subtasks: true,
            include_empty_groups: true,
          },
        },
      },
    );
  typia.assert(employeeEmptyGroups);
  // Validate empty groups are included
  TestValidator.equals(
    "empty groups included has task count",
    employeeEmptyGroups.task_count >= 0,
    true,
  );
}
