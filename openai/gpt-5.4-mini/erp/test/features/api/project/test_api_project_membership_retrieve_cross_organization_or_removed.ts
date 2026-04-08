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
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { generate_random_erp_hrm_time_member_projects_memberships_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_memberships_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";
import { prepare_random_erp_hrm_time_project_membership } from "../../../prepare/prepare_random_erp_hrm_time_project_membership";

export async function test_api_project_membership_retrieve_cross_organization_or_removed(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com/erp/hrm-time/join",
      referrer: "https://example.com/erp/hrm-time",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(owner);
  const ownerAuthedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${owner.token.access}` },
  };
  const project = await generate_random_erp_hrm_time_member_projects_create(
    ownerAuthedConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: 100,
        startDate: new Date().toISOString(),
        endDate: null,
      },
    },
  );
  typia.assert(project);
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com/erp/hrm-time/join",
      referrer: "https://example.com/erp/hrm-time",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(employee);
  const employeeAuthedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${employee.token.access}` },
  };
  const membership =
    await generate_random_erp_hrm_time_member_projects_memberships_create(
      ownerAuthedConnection,
      {
        params: { projectId: project.id },
        body: {
          erpHrmtimeEmployeeId: employee.id,
          projectRole: "member",
        },
      },
    );
  typia.assert(membership);
  const retrieved =
    await api.functional.erpHrmTime.member.projects.memberships.at(
      ownerAuthedConnection,
      {
        projectId: project.id,
        membershipId: membership.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals("retrieved membership id", retrieved.id, membership.id);
  TestValidator.equals(
    "retrieved project membership project id",
    retrieved.erp_hrm_time_project_id,
    project.id,
  );
  TestValidator.equals(
    "retrieved employee membership id",
    retrieved.erp_hrm_time_employee_id,
    employee.id,
  );
  const otherOwnerConnection: api.IConnection = { host: connection.host };
  const otherOwner = await authorize_member_join(otherOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com/erp/hrm-time/join",
      referrer: "https://example.com/erp/hrm-time",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(otherOwner);
  const otherOwnerAuthedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${otherOwner.token.access}` },
  };
  await TestValidator.httpError(
    "cross-organization membership retrieval must not leak",
    [400, 401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.projects.memberships.at(
        otherOwnerAuthedConnection,
        {
          projectId: project.id,
          membershipId: membership.id,
        },
      );
    },
  );
  await TestValidator.httpError(
    "membership lookup must fail when the project does not match the membership scope",
    [400, 404],
    async () => {
      const mismatchedProject =
        await generate_random_erp_hrm_time_member_projects_create(
          ownerAuthedConnection,
          {
            body: {
              name: RandomGenerator.name(),
              description: RandomGenerator.paragraph({ sentences: 2 }),
              colorCode: "#44aa55",
              status: "active",
              budgetHours: null,
              startDate: null,
              endDate: null,
            },
          },
        );
      typia.assert(mismatchedProject);
      await api.functional.erpHrmTime.member.projects.memberships.at(
        ownerAuthedConnection,
        {
          projectId: mismatchedProject.id,
          membershipId: membership.id,
        },
      );
    },
  );
}
