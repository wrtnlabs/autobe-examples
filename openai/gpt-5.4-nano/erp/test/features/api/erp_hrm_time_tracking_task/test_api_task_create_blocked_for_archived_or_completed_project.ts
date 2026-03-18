import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { generate_random_erp_hrm_time_tracking_member_projects_memberships_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_memberships_create";
import { generate_random_erp_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_tasks_create";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";
import { prepare_random_erp_hrm_time_tracking_project_membership } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project_membership";
import { prepare_random_erp_hrm_time_tracking_task } from "../../../prepare/prepare_random_erp_hrm_time_tracking_task";

export async function test_api_task_create_blocked_for_archived_or_completed_project(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join (actor who will create the project and attempt the task)
  const memberConnection: api.IConnection = { host: connection.host };
  const organizationName = RandomGenerator.name();
  const organizationDescription = RandomGenerator.paragraph({ sentences: 2 });
  const credentials: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    organizationName,
    organizationDescription,
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    organizationLogoUrl: null,
    ip: null,
  };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: credentials,
  });
  typia.assert(authorizedMember);
  // 2) Create an archived project
  const project =
    await api.functional.erpHrmTimeTracking.member.projects.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color: "#1A73E8",
          status: "archived",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(project);
  // 3) Create a project membership for an employee (ensure same org)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeCredentials: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    organizationName,
    organizationDescription,
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    organizationLogoUrl: null,
    ip: null,
  };
  const authorizedEmployee = await authorize_member_join(employeeConnection, {
    body: employeeCredentials,
  });
  typia.assert(authorizedEmployee);
  const membership =
    await api.functional.erpHrmTimeTracking.member.projects.memberships.create(
      memberConnection,
      {
        projectId: project.id,
        body: {
          employee_id: authorizedEmployee.id,
          membership_role: "member",
        } satisfies IErpHrmTimeTrackingProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  // 4) Attempt to create a task in archived project (must be rejected)
  await TestValidator.error(
    "task creation should be blocked for archived project",
    async () => {
      await api.functional.erpHrmTimeTracking.member.projects.tasks.create(
        memberConnection,
        {
          projectId: project.id,
          body: {
            title: RandomGenerator.name(3),
            description: null,
            status: "todo",
            priority: "normal",
            assigned_employee_id: membership.employee_id,
            parent_task_id: null,
            estimated_hours: null,
            due_date: null,
          } satisfies IErpHrmTimeTrackingTask.ICreate,
        },
      );
    },
  );
}
