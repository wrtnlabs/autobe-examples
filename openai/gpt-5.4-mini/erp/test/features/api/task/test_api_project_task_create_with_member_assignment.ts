import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectMembership";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
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
import { prepare_random_erp_hrm_time_task } from "../../../prepare/prepare_random_erp_hrm_time_task";

export async function test_api_project_task_create_with_member_assignment(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = `owner_${typia.random<string & tags.Format<"uuid">>()}@test.com`;
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/erpHrmTime/auth/member/join",
      referrer: "https://example.com/erpHrmTime",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(owner);
  const project = await api.functional.erpHrmTime.member.projects.create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#4f46e5",
        status: "active",
        budgetHours: 120,
        startDate: new Date().toISOString(),
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = `member_${typia.random<string & tags.Format<"uuid">>()}@test.com`;
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/erpHrmTime/auth/member/join",
      referrer: "https://example.com/erpHrmTime",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const membership =
    await api.functional.erpHrmTime.member.projects.memberships.create(
      ownerConnection,
      {
        projectId: project.id,
        body: {
          employeeId: member.id,
          projectRole: "member",
        } satisfies IErpHrmTimeProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  const parentTask =
    await api.functional.erpHrmTime.member.projects.tasks.create(
      ownerConnection,
      {
        projectId: project.id,
        body: {
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          priority: "high",
          estimatedHours: 8,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          employeeId: member.id,
        } satisfies IErpHrmTimeTask.ICreate,
      },
    );
  typia.assert(parentTask);
  const childTask =
    await api.functional.erpHrmTime.member.projects.tasks.create(
      ownerConnection,
      {
        projectId: project.id,
        body: {
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          priority: "medium",
          estimatedHours: 3,
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          employeeId: member.id,
          parentTaskId: parentTask.id,
        } satisfies IErpHrmTimeTask.ICreate,
      },
    );
  typia.assert(childTask);
  TestValidator.equals("project reference", childTask.project.id, project.id);
  TestValidator.equals("assignee reference", childTask.employee?.id, member.id);
  TestValidator.equals(
    "parent task reference",
    childTask.parentTask?.id,
    parentTask.id,
  );
  const outsiderConnection: api.IConnection = { host: connection.host };
  const outsiderEmail = `outsider_${typia.random<string & tags.Format<"uuid">>()}@test.com`;
  const outsider = await authorize_member_join(outsiderConnection, {
    body: {
      email: outsiderEmail,
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/erpHrmTime/auth/member/join",
      referrer: "https://example.com/erpHrmTime",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(outsider);
  await TestValidator.error("reject non-member assignee", async () => {
    await api.functional.erpHrmTime.member.projects.tasks.create(
      ownerConnection,
      {
        projectId: project.id,
        body: {
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          priority: "low",
          estimatedHours: 1,
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          employeeId: outsider.id,
        } satisfies IErpHrmTimeTask.ICreate,
      },
    );
  });
  await TestValidator.error("reject deeper nested parent task", async () => {
    await api.functional.erpHrmTime.member.projects.tasks.create(
      ownerConnection,
      {
        projectId: project.id,
        body: {
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          priority: "medium",
          estimatedHours: 2,
          dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
          employeeId: member.id,
          parentTaskId: childTask.id,
        } satisfies IErpHrmTimeTask.ICreate,
      },
    );
  });
}
