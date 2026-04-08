import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectMembership";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { generate_random_erp_hrm_time_member_projects_memberships_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_memberships_create";
import { generate_random_erp_hrm_time_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_tasks_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";
import { prepare_random_erp_hrm_time_project_membership } from "../../../prepare/prepare_random_erp_hrm_time_project_membership";
import { prepare_random_erp_hrm_time_task_history_entry } from "../../../prepare/prepare_random_erp_hrm_time_task_history_entry";

export async function test_api_task_creation_with_project_lead_hierarchy_rules(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234Abcd!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerAuthorized);
  const ownerSession: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: ownerAuthorized.token.access,
    },
  };
  const project = await generate_random_erp_hrm_time_member_projects_create(
    ownerSession,
    {
      body: {
        name: `project-${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: 120,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const leadConnection: api.IConnection = { host: connection.host };
  const leadAuthorized = await authorize_member_join(leadConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234Abcd!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(leadAuthorized);
  const leadSession: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: leadAuthorized.token.access,
    },
  };
  const membership =
    await api.functional.erpHrmTime.member.projects.memberships.create(
      ownerSession,
      {
        projectId: project.id,
        body: {
          erpHrmtimeEmployeeId: typia.random<string & tags.Format<"uuid">>(),
          projectRole: "member",
        } satisfies IErpHrmTimeProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  const promotedMembership =
    await api.functional.erpHrmTime.member.projects.memberships.update(
      ownerSession,
      {
        projectId: project.id,
        membershipId: membership.id,
        body: {
          project_role: "project-lead",
        } satisfies IErpHrmTimeProjectMembership.IUpdate,
      },
    );
  typia.assert(promotedMembership);
  TestValidator.equals(
    "membership promoted to project lead",
    promotedMembership.project_role,
    "project-lead",
  );
  const topLevelTask =
    await generate_random_erp_hrm_time_member_projects_tasks_create(
      ownerSession,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          priority: "high",
          status: "open",
          estimatedHours: 8,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        } satisfies IErpHrmTimeTaskHistoryEntry.ICreate,
      },
    );
  typia.assert(topLevelTask);
  TestValidator.equals(
    "top-level task has no parent",
    topLevelTask.parentTask,
    null,
  );
  TestValidator.equals(
    "top-level task project",
    topLevelTask.project.id,
    project.id,
  );
  const subTask =
    await generate_random_erp_hrm_time_member_projects_tasks_create(
      ownerSession,
      {
        params: { projectId: project.id },
        body: {
          title: `${RandomGenerator.name()} subtask`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          priority: "medium",
          status: "open",
          parentTaskId: topLevelTask.id,
        } satisfies IErpHrmTimeTaskHistoryEntry.ICreate,
      },
    );
  typia.assert(subTask);
  TestValidator.equals(
    "subtask parent matches top-level task",
    subTask.parentTask?.id,
    topLevelTask.id,
  );
  TestValidator.equals(
    "subtask project matches",
    subTask.project.id,
    project.id,
  );
  await TestValidator.httpError(
    "reject deeper subtask nesting",
    [400, 403, 404],
    async () => {
      await generate_random_erp_hrm_time_member_projects_tasks_create(
        ownerSession,
        {
          params: { projectId: project.id },
          body: {
            title: `${RandomGenerator.name()} deeper subtask`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            priority: "low",
            status: "open",
            parentTaskId: subTask.id,
          } satisfies IErpHrmTimeTaskHistoryEntry.ICreate,
        },
      );
    },
  );
}
