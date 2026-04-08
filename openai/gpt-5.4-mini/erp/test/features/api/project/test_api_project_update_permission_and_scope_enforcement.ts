import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";

export async function test_api_project_update_permission_and_scope_enforcement(
  connection: api.IConnection,
): Promise<void> {
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const authorizedConnection: api.IConnection = { host: connection.host };
  const otherOrganizationConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedMember = await authorize_member_join(
    unauthorizedConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234",
        displayName: RandomGenerator.name(),
        href: "https://example.com/signup",
        referrer: "https://example.com/",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(unauthorizedMember);
  const authorizedMember = await authorize_member_join(authorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      displayName: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorizedMember);
  const otherOrganizationMember = await authorize_member_join(
    otherOrganizationConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234",
        displayName: RandomGenerator.name(),
        href: "https://example.com/signup",
        referrer: "https://example.com/",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(otherOrganizationMember);
  const project = await generate_random_erp_hrm_time_member_projects_create(
    authorizedConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366FF",
        status: "active",
        budgetHours: 120,
        startDate: new Date("2026-04-01T00:00:00.000Z").toISOString(),
        endDate: new Date("2026-06-30T00:00:00.000Z").toISOString(),
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  await TestValidator.httpError(
    "member without project manage permission cannot update project",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.projects.update(
        unauthorizedConnection,
        {
          projectId: project.id,
          body: {
            name: `${project.name} updated`,
          } satisfies IErpHrmTimeProject.IUpdate,
        },
      );
    },
  );
  await TestValidator.httpError(
    "project update is rejected outside current organization scope",
    [403, 404],
    async () => {
      await api.functional.erpHrmTime.member.projects.update(
        otherOrganizationConnection,
        {
          projectId: project.id,
          body: {
            name: `${project.name} other scope`,
          } satisfies IErpHrmTimeProject.IUpdate,
        },
      );
    },
  );
  const updatedProject = await api.functional.erpHrmTime.member.projects.update(
    authorizedConnection,
    {
      projectId: project.id,
      body: {
        name: `${project.name} updated`,
        description: `${project.description ?? ""} revised`,
        color_code: "#FF6633",
        status: "active",
        budget_hours: 160,
        start_date: new Date("2026-04-05T00:00:00.000Z").toISOString(),
        end_date: new Date("2026-07-15T00:00:00.000Z").toISOString(),
      } satisfies IErpHrmTimeProject.IUpdate,
    },
  );
  typia.assert(updatedProject);
  TestValidator.equals(
    "project id remains stable",
    updatedProject.id,
    project.id,
  );
  TestValidator.equals(
    "organization remains stable",
    updatedProject.organization,
    project.organization,
  );
  TestValidator.equals(
    "project name updated",
    updatedProject.name,
    `${project.name} updated`,
  );
  TestValidator.equals(
    "project description updated",
    updatedProject.description,
    `${project.description ?? ""} revised`,
  );
  TestValidator.equals(
    "project color updated",
    updatedProject.colorCode,
    "#FF6633",
  );
  TestValidator.equals(
    "project budget updated",
    updatedProject.budgetHours,
    160,
  );
  TestValidator.equals(
    "project start date updated",
    updatedProject.startDate,
    new Date("2026-04-05T00:00:00.000Z").toISOString(),
  );
  TestValidator.equals(
    "project end date updated",
    updatedProject.endDate,
    new Date("2026-07-15T00:00:00.000Z").toISOString(),
  );
  await TestValidator.error(
    "archived or completed lifecycle update should either succeed or be rejected by business rules",
    async () => {
      const archivedOrCompletedProject =
        await api.functional.erpHrmTime.member.projects.update(
          authorizedConnection,
          {
            projectId: project.id,
            body: {
              status: "archived",
            } satisfies IErpHrmTimeProject.IUpdate,
          },
        );
      typia.assert(archivedOrCompletedProject);
      TestValidator.predicate(
        "project remains linked to same organization after archival",
        archivedOrCompletedProject.organization.id === project.organization.id,
      );
      const completedProject =
        await api.functional.erpHrmTime.member.projects.update(
          authorizedConnection,
          {
            projectId: project.id,
            body: {
              status: "completed",
            } satisfies IErpHrmTimeProject.IUpdate,
          },
        );
      typia.assert(completedProject);
      TestValidator.predicate(
        "project remains linked to same organization after completion",
        completedProject.organization.id === project.organization.id,
      );
    },
  );
}
