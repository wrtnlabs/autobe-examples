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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeProject";
import type { IPageIErpHrmTimeProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_employees_create } from "../../../generate/generate_random_erp_hrm_time_member_employees_create";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { generate_random_erp_hrm_time_member_projects_memberships_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_memberships_create";
import { prepare_random_erp_hrm_time_employee_dashboard_summary } from "../../../prepare/prepare_random_erp_hrm_time_employee_dashboard_summary";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";
import { prepare_random_erp_hrm_time_project_membership } from "../../../prepare/prepare_random_erp_hrm_time_project_membership";

export async function test_api_project_membership_remove_success_preserves_other_assignments(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(actorConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com` as never,
      password: "password123!" as never,
      displayName: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  actorConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  const projectOne = await generate_random_erp_hrm_time_member_projects_create(
    actorConnection,
    {
      body: {
        name: `project-one-${RandomGenerator.alphabets(6)}`,
        colorCode: "#112233",
        status: "active",
      },
    },
  );
  typia.assert(projectOne);
  const projectTwo = await generate_random_erp_hrm_time_member_projects_create(
    actorConnection,
    {
      body: {
        name: `project-two-${RandomGenerator.alphabets(6)}`,
        colorCode: "#334455",
        status: "active",
      },
    },
  );
  typia.assert(projectTwo);
  const firstMembership =
    await generate_random_erp_hrm_time_member_projects_memberships_create(
      actorConnection,
      {
        params: { projectId: projectOne.id },
        body: {
          erpHrmtimeEmployeeId: typia.random<string & tags.Format<"uuid">>(),
          projectRole: "member",
        },
      },
    );
  typia.assert(firstMembership);
  const secondMembership =
    await generate_random_erp_hrm_time_member_projects_memberships_create(
      actorConnection,
      {
        params: { projectId: projectTwo.id },
        body: {
          erpHrmtimeEmployeeId: firstMembership.employee.id,
          projectRole: "member",
        },
      },
    );
  typia.assert(secondMembership);
  const beforeFirstProjectMemberships =
    await api.functional.erpHrmTime.member.projects.memberships.index(
      actorConnection,
      {
        projectId: projectOne.id,
        body: {},
      },
    );
  typia.assert(beforeFirstProjectMemberships);
  const beforeSecondProjectMemberships =
    await api.functional.erpHrmTime.member.projects.memberships.index(
      actorConnection,
      {
        projectId: projectTwo.id,
        body: {},
      },
    );
  typia.assert(beforeSecondProjectMemberships);
  TestValidator.predicate(
    "first project membership exists before deletion",
    beforeFirstProjectMemberships.data.some(
      (item) => item.id === firstMembership.id,
    ),
  );
  TestValidator.predicate(
    "second project membership exists before deletion",
    beforeSecondProjectMemberships.data.some(
      (item) => item.id === secondMembership.id,
    ),
  );
  await api.functional.erpHrmTime.member.projects.memberships.erase(
    actorConnection,
    {
      projectId: projectOne.id,
      membershipId: firstMembership.id,
    },
  );
  const afterFirstProjectMemberships =
    await api.functional.erpHrmTime.member.projects.memberships.index(
      actorConnection,
      {
        projectId: projectOne.id,
        body: {},
      },
    );
  typia.assert(afterFirstProjectMemberships);
  const afterSecondProjectMemberships =
    await api.functional.erpHrmTime.member.projects.memberships.index(
      actorConnection,
      {
        projectId: projectTwo.id,
        body: {},
      },
    );
  typia.assert(afterSecondProjectMemberships);
  const assignedProjectsAfterDeletion =
    await api.functional.erpHrmTime.member.projects.assigned.index(
      actorConnection,
      {
        body: {},
      },
    );
  typia.assert(assignedProjectsAfterDeletion);
  TestValidator.predicate(
    "deleted membership is removed from project membership list",
    !afterFirstProjectMemberships.data.some(
      (item) => item.id === firstMembership.id,
    ),
  );
  TestValidator.predicate(
    "other project membership remains after deletion",
    afterSecondProjectMemberships.data.some(
      (item) => item.id === secondMembership.id,
    ),
  );
  TestValidator.predicate(
    "deleted project no longer appears in assigned projects",
    !assignedProjectsAfterDeletion.data.some(
      (item) => item.id === projectOne.id,
    ),
  );
  TestValidator.predicate(
    "other project still appears in assigned projects",
    assignedProjectsAfterDeletion.data.some(
      (item) => item.id === projectTwo.id,
    ),
  );
}
