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

export async function test_api_project_membership_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnectionA: api.IConnection = { host: connection.host };
  const memberConnectionA: api.IConnection = { host: connection.host };
  const ownerConnectionB: api.IConnection = { host: connection.host };
  const ownerA = await authorize_member_join(ownerConnectionA, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com` satisfies string &
        tags.Format<"email">,
      password: "Password123!" satisfies string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerA);
  const memberA = await authorize_member_join(memberConnectionA, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com` satisfies string &
        tags.Format<"email">,
      password: "Password123!" satisfies string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(memberA);
  const ownerB = await authorize_member_join(ownerConnectionB, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com` satisfies string &
        tags.Format<"email">,
      password: "Password123!" satisfies string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerB);
  const projectA = await generate_random_erp_hrm_time_member_projects_create(
    ownerConnectionA,
    {
      body: {
        name: `project-a-${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(projectA);
  const projectB = await generate_random_erp_hrm_time_member_projects_create(
    ownerConnectionB,
    {
      body: {
        name: `project-b-${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#33aa66",
        status: "active",
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(projectB);
  const employeeA = await generate_random_erp_hrm_time_member_employees_create(
    ownerConnectionA,
    {
      body: {
        member_id: ownerA.id,
        role_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
      } satisfies IErpHrmTimeEmployeeDashboardSummary.ICreate,
    },
  );
  typia.assert(employeeA);
  const employeeB = await generate_random_erp_hrm_time_member_employees_create(
    ownerConnectionB,
    {
      body: {
        member_id: ownerB.id,
        role_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
      } satisfies IErpHrmTimeEmployeeDashboardSummary.ICreate,
    },
  );
  typia.assert(employeeB);
  const membership =
    await generate_random_erp_hrm_time_member_projects_memberships_create(
      ownerConnectionA,
      {
        params: { projectId: projectA.id },
        body: {
          erpHrmtimeEmployeeId: employeeA.id,
          projectRole: "member",
        } satisfies IErpHrmTimeProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  TestValidator.equals(
    "project membership should reference the requested project",
    membership.erp_hrm_time_project_id,
    projectA.id,
  );
  TestValidator.equals(
    "project membership should reference the requested employee",
    membership.erp_hrm_time_employee_id,
    employeeA.id,
  );
  await TestValidator.httpError(
    "cross-organization project assignment must be rejected",
    [400, 401, 403, 404, 409],
    async () => {
      await generate_random_erp_hrm_time_member_projects_memberships_create(
        ownerConnectionA,
        {
          params: { projectId: projectB.id },
          body: {
            erpHrmtimeEmployeeId: employeeA.id,
            projectRole: "member",
          } satisfies IErpHrmTimeProjectMembership.ICreate,
        },
      );
    },
  );
  await TestValidator.httpError(
    "cross-organization employee assignment must be rejected",
    [400, 401, 403, 404, 409],
    async () => {
      await generate_random_erp_hrm_time_member_projects_memberships_create(
        ownerConnectionA,
        {
          params: { projectId: projectA.id },
          body: {
            erpHrmtimeEmployeeId: employeeB.id,
            projectRole: "member",
          } satisfies IErpHrmTimeProjectMembership.ICreate,
        },
      );
    },
  );
  await TestValidator.httpError(
    "member without project management permission must be denied",
    [400, 401, 403, 404, 409],
    async () => {
      await generate_random_erp_hrm_time_member_projects_memberships_create(
        memberConnectionA,
        {
          params: { projectId: projectA.id },
          body: {
            erpHrmtimeEmployeeId: employeeA.id,
            projectRole: "member",
          } satisfies IErpHrmTimeProjectMembership.ICreate,
        },
      );
    },
  );
}
