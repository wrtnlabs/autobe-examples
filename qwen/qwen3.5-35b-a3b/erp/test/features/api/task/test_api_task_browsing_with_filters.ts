import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTaskAnalyticGrouping } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskAnalyticGrouping";
import type { IHrmsTaskParentTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskParentTaskFilter";
import type { IHrmsTaskPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskPriority";
import type { IHrmsTaskStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskStatusHistory";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTask";
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
import { generate_random_hrms_member_projects_members_add_member } from "../../../generate/generate_random_hrms_member_projects_members_add_member";
import { generate_random_hrms_member_projects_tasks_create } from "../../../generate/generate_random_hrms_member_projects_tasks_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_project_member } from "../../../prepare/prepare_random_hrms_project_member";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";

export async function test_api_task_browsing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication setup
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
    },
  });
  typia.assert(member);
  // 2. Organization membership setup
  const organizationId = member.organization_memberships[0]?.organization.id;
  TestValidator.predicate(
    "member has organization membership",
    !!organizationId,
  );
  if (organizationId) {
    const organizationMember =
      await generate_random_hrms_member_organization_members_create(
        memberConnection,
        {
          body: {
            hrms_member_id: member.id,
            hrms_organization_id: organizationId,
            hrms_organization_role_id:
              member.organization_memberships[0].organizationRole.id,
          },
        },
      );
    typia.assert(organizationMember);
    // 3. Create project within organization
    const project =
      await generate_random_hrms_member_organizations_projects_create(
        memberConnection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            color_code: "#3498db",
          },
          params: { organizationId },
        },
      );
    typia.assert(project);
    const projectId = (project as any).id;
    // 4. Create another member to assign to tasks
    const member2Connection: api.IConnection = { host: connection.host };
    const member2 = await authorize_member_join(member2Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
      },
    });
    typia.assert(member2);
    const organizationMember2 =
      await generate_random_hrms_member_organization_members_create(
        member2Connection,
        {
          body: {
            hrms_member_id: member2.id,
            hrms_organization_id: organizationId,
            hrms_organization_role_id:
              member.organization_memberships[0].organizationRole.id,
          },
        },
      );
    typia.assert(organizationMember2);
    // 5. Add both employees to project
    await generate_random_hrms_member_projects_members_add_member(
      memberConnection,
      {
        body: {
          employee_id: organizationMember.member.id,
          role: "member",
        },
        params: { projectId },
      },
    );
    await generate_random_hrms_member_projects_members_add_member(
      memberConnection,
      {
        body: {
          employee_id: organizationMember2.member.id,
          role: "member",
        },
        params: { projectId },
      },
    );
    const employeeId1 = organizationMember.member.id;
    const employeeId2 = organizationMember2.member.id;
    // 6. Create tasks with various statuses and priorities
    const task1 = await generate_random_hrms_member_projects_tasks_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          status: "open" as const,
          priority: "high" as const,
          hrms_employee_id: employeeId1,
        },
        params: { projectId },
      },
    );
    typia.assert(task1);
    const task2 = await generate_random_hrms_member_projects_tasks_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          status: "in-progress" as const,
          priority: "urgent" as const,
          hrms_employee_id: employeeId2,
        },
        params: { projectId },
      },
    );
    typia.assert(task2);
    const task3 = await generate_random_hrms_member_projects_tasks_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          status: "completed" as const,
          priority: "low" as const,
          hrms_employee_id: employeeId1,
        },
        params: { projectId },
      },
    );
    typia.assert(task3);
    const task4 = await generate_random_hrms_member_projects_tasks_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          status: "open" as const,
          priority: "medium" as const,
        },
        params: { projectId },
      },
    );
    typia.assert(task4);
    const task5 = await generate_random_hrms_member_projects_tasks_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          status: "in-progress" as const,
          priority: "high" as const,
          hrms_employee_id: employeeId2,
        },
        params: { projectId },
      },
    );
    typia.assert(task5);
    // 7. Test filter by status: status=["open", "in-progress"]
    const response1 = await api.functional.hrms.member.tasks.index(
      memberConnection,
      {
        body: {
          status: ["open", "in-progress"],
        },
      },
    );
    typia.assert(response1);
    TestValidator.equals(
      "status filter returns correct count",
      response1.data.length,
      3,
    );
    // 8. Test filter by priority: priority=["high", "urgent"]
    const response2 = await api.functional.hrms.member.tasks.index(
      memberConnection,
      {
        body: {
          priority: ["high", "urgent"],
        },
      },
    );
    typia.assert(response2);
    TestValidator.equals(
      "priority filter returns correct count",
      response2.data.length,
      3,
    );
    // 9. Test filter by projectIds: projectIds=[{projectId}]
    const response3 = await api.functional.hrms.member.tasks.index(
      memberConnection,
      {
        body: {
          projectIds: [projectId],
        },
      },
    );
    typia.assert(response3);
    TestValidator.equals(
      "projectIds filter returns correct count",
      response3.data.length,
      5,
    );
    // 10. Test filter by employeeIds: employeeIds=[{employeeId1}]
    const response4 = await api.functional.hrms.member.tasks.index(
      memberConnection,
      {
        body: {
          employeeIds: [employeeId1],
        },
      },
    );
    typia.assert(response4);
    TestValidator.equals(
      "employeeIds filter returns correct count",
      response4.data.length,
      2,
    );
    // 11. Test filter unassigned: withAssignment=false
    const response5 = await api.functional.hrms.member.tasks.index(
      memberConnection,
      {
        body: {
          withAssignment: false,
        },
      },
    );
    typia.assert(response5);
    TestValidator.equals(
      "withAssignment=false returns correct count",
      response5.data.length,
      1,
    );
    // 12. Test combined filters: status + priority + projectIds
    const response6 = await api.functional.hrms.member.tasks.index(
      memberConnection,
      {
        body: {
          status: ["open"],
          priority: ["high"],
          projectIds: [projectId],
        },
      },
    );
    typia.assert(response6);
    TestValidator.equals(
      "combined filter returns correct count",
      response6.data.length,
      1,
    );
    // 13. Test pagination: page=1, limit=10
    const response7 = await api.functional.hrms.member.tasks.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
    typia.assert(response7);
    TestValidator.equals(
      "page 1 pagination current",
      response7.pagination.current,
      1,
    );
    TestValidator.equals(
      "page 1 pagination limit",
      response7.pagination.limit,
      10,
    );
    TestValidator.equals(
      "page 1 pagination records",
      response7.pagination.records,
      5,
    );
    TestValidator.equals(
      "page 1 pagination pages",
      response7.pagination.pages,
      1,
    );
    // 14. Test pagination metadata accuracy
    TestValidator.equals(
      "pagination records accuracy",
      response7.pagination.records,
      response7.data.length,
    );
    TestValidator.equals(
      "pagination pages calculation",
      response7.pagination.pages,
      Math.ceil(response7.pagination.records / response7.pagination.limit),
    );
  }
}