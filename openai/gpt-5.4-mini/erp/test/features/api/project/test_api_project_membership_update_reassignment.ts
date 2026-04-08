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

export async function test_api_project_membership_update_reassignment(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerAuth);
  const ownerScopedConnection: api.IConnection = { host: connection.host };
  ownerScopedConnection.headers = {
    Authorization: `Bearer ${ownerAuth.token.access}`,
  };
  const project = await generate_random_erp_hrm_time_member_projects_create(
    ownerScopedConnection,
    {
      body: {
        name: `Project ${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: 120,
        startDate: new Date().toISOString(),
        endDate: null,
      },
    },
  );
  typia.assert(project);
  const firstEmployee =
    await generate_random_erp_hrm_time_member_employees_create(
      ownerScopedConnection,
      {
        body: {
          member_id: ownerAuth.id,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          department_id: null,
          position_title: "Developer",
          employment_type: "full-time",
        },
      },
    );
  typia.assert(firstEmployee);
  const secondConnection: api.IConnection = { host: connection.host };
  const secondAuth = await authorize_member_join(secondConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(secondAuth);
  const secondScopedConnection: api.IConnection = { host: connection.host };
  secondScopedConnection.headers = {
    Authorization: `Bearer ${secondAuth.token.access}`,
  };
  const secondEmployee =
    await generate_random_erp_hrm_time_member_employees_create(
      secondScopedConnection,
      {
        body: {
          member_id: secondAuth.id,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          department_id: null,
          position_title: "Designer",
          employment_type: "contractor",
        },
      },
    );
  typia.assert(secondEmployee);
  const membership =
    await generate_random_erp_hrm_time_member_projects_memberships_create(
      ownerScopedConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          erpHrmtimeEmployeeId: firstEmployee.id,
          projectRole: "member",
        },
      },
    );
  typia.assert(membership);
  const before = {
    id: membership.id,
    projectId: membership.erp_hrm_time_project_id,
    createdAt: membership.created_at,
    updatedAt: membership.updated_at,
    employeeId: membership.erp_hrm_time_employee_id,
    projectRole: membership.project_role,
  };
  const updated =
    await api.functional.erpHrmTime.member.projects.memberships.update(
      ownerScopedConnection,
      {
        projectId: project.id,
        membershipId: membership.id,
        body: {
          erp_hrm_time_employee_id: secondEmployee.id,
          project_role: "project-lead",
        },
      },
    );
  typia.assert(updated);
  TestValidator.equals("membership identity preserved", updated.id, before.id);
  TestValidator.equals(
    "project context preserved",
    updated.erp_hrm_time_project_id,
    before.projectId,
  );
  TestValidator.equals(
    "createdAt preserved",
    updated.created_at,
    before.createdAt,
  );
  TestValidator.predicate(
    "updatedAt should not go backwards",
    updated.updated_at >= before.updatedAt,
  );
  TestValidator.notEquals(
    "employee reassigned",
    updated.erp_hrm_time_employee_id,
    before.employeeId,
  );
  TestValidator.equals(
    "employee reassigned to target",
    updated.erp_hrm_time_employee_id,
    secondEmployee.id,
  );
  TestValidator.equals(
    "project role updated",
    updated.project_role,
    "project-lead",
  );
  TestValidator.equals(
    "project relation preserved",
    updated.project.id,
    project.id,
  );
  TestValidator.predicate(
    "membership remains active",
    updated.deleted_at === null,
  );
}
