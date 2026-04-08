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

export async function test_api_project_membership_create_assignment(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/erpHrmTime/register",
      referrer: "https://example.com/erpHrmTime",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerAuthorized);
  const project = await generate_random_erp_hrm_time_member_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: 120,
        startDate: new Date().toISOString(),
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const employeeJoinConnection: api.IConnection = { host: connection.host };
  const employeeAuthorized = await authorize_member_join(
    employeeJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        displayName: RandomGenerator.name(),
        avatarImageUrl: null,
        phoneNumber: null,
        href: "https://example.com/erpHrmTime/register",
        referrer: "https://example.com/erpHrmTime",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(employeeAuthorized);
  const employee = await generate_random_erp_hrm_time_member_employees_create(
    ownerConnection,
    {
      body: {
        member_id: employeeAuthorized.id,
        role_id: typia.random<string & tags.Format<"uuid">>(),
        department_id: null,
        position_title: RandomGenerator.name(),
        employment_type: "full-time",
      } satisfies IErpHrmTimeEmployeeDashboardSummary.ICreate,
    },
  );
  typia.assert(employee);
  const membership =
    await generate_random_erp_hrm_time_member_projects_memberships_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          erpHrmtimeEmployeeId: employee.id,
          projectRole: "member",
        } satisfies IErpHrmTimeProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  TestValidator.equals(
    "membership project id matches route project",
    membership.erp_hrm_time_project_id,
    project.id,
  );
  TestValidator.equals(
    "membership employee id matches request employee",
    membership.erp_hrm_time_employee_id,
    employee.id,
  );
  TestValidator.equals(
    "membership project relation matches route project",
    membership.project.id,
    project.id,
  );
  TestValidator.equals(
    "membership employee relation matches assigned employee",
    membership.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "membership role persists",
    membership.project_role,
    "member",
  );
  TestValidator.predicate(
    "membership created timestamp exists",
    membership.created_at.length > 0,
  );
  TestValidator.predicate(
    "membership updated timestamp exists",
    membership.updated_at.length > 0,
  );
  TestValidator.equals("membership is active", membership.deleted_at, null);
  await TestValidator.httpError(
    "duplicate project membership should be rejected",
    [400, 409],
    async () => {
      await generate_random_erp_hrm_time_member_projects_memberships_create(
        ownerConnection,
        {
          params: { projectId: project.id },
          body: {
            erpHrmtimeEmployeeId: employee.id,
            projectRole: "project-lead",
          } satisfies IErpHrmTimeProjectMembership.ICreate,
        },
      );
    },
  );
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedAuthorized = await authorize_member_join(
    unauthorizedConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        displayName: RandomGenerator.name(),
        avatarImageUrl: null,
        phoneNumber: null,
        href: "https://example.com/erpHrmTime/register",
        referrer: "https://example.com/erpHrmTime",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(unauthorizedAuthorized);
  await TestValidator.httpError(
    "member without project management should not create membership",
    [401, 403],
    async () => {
      await generate_random_erp_hrm_time_member_projects_memberships_create(
        unauthorizedConnection,
        {
          params: { projectId: project.id },
          body: {
            erpHrmtimeEmployeeId: employee.id,
            projectRole: "member",
          } satisfies IErpHrmTimeProjectMembership.ICreate,
        },
      );
    },
  );
  const secondProject =
    await generate_random_erp_hrm_time_member_projects_create(ownerConnection, {
      body: {
        name: `${project.name} secondary`,
        description: null,
        colorCode: "#33aa55",
        status: "active",
        budgetHours: null,
        startDate: null,
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    });
  typia.assert(secondProject);
  const secondEmployeeJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const secondEmployeeAuthorized = await authorize_member_join(
    secondEmployeeJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        displayName: RandomGenerator.name(),
        avatarImageUrl: null,
        phoneNumber: null,
        href: "https://example.com/erpHrmTime/register",
        referrer: "https://example.com/erpHrmTime",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(secondEmployeeAuthorized);
  const secondEmployee =
    await generate_random_erp_hrm_time_member_employees_create(
      ownerConnection,
      {
        body: {
          member_id: secondEmployeeAuthorized.id,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          department_id: null,
          position_title: RandomGenerator.name(),
          employment_type: "contractor",
        } satisfies IErpHrmTimeEmployeeDashboardSummary.ICreate,
      },
    );
  typia.assert(secondEmployee);
  await TestValidator.httpError(
    "project membership must honor route-scoped project id",
    [400, 404, 409],
    async () => {
      await generate_random_erp_hrm_time_member_projects_memberships_create(
        ownerConnection,
        {
          params: { projectId: secondProject.id },
          body: {
            erpHrmtimeEmployeeId: employee.id,
            projectRole: "project-lead",
          } satisfies IErpHrmTimeProjectMembership.ICreate,
        },
      );
    },
  );
  const secondMembership =
    await generate_random_erp_hrm_time_member_projects_memberships_create(
      ownerConnection,
      {
        params: { projectId: secondProject.id },
        body: {
          erpHrmtimeEmployeeId: secondEmployee.id,
          projectRole: "project-lead",
        } satisfies IErpHrmTimeProjectMembership.ICreate,
      },
    );
  typia.assert(secondMembership);
  TestValidator.equals(
    "project lead role persists",
    secondMembership.project_role,
    "project-lead",
  );
}
