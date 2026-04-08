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

export async function test_api_project_update_preserves_memberships_tasks_and_timelogs(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const createdAtReference = new Date();
  const initialStartDate = new Date(
    createdAtReference.getTime() - 1000 * 60 * 60 * 24,
  ).toISOString();
  const initialEndDate = new Date(
    createdAtReference.getTime() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const created = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#33AAFF",
        status: "active",
        budgetHours: 120,
        startDate: initialStartDate,
        endDate: initialEndDate,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(created);
  const originalProjectId = created.id;
  const originalOrganizationId = created.organization.id;
  const originalCreatedAt = created.createdAt;
  const firstUpdateDescription = RandomGenerator.paragraph({ sentences: 3 });
  const firstUpdateStartDate = new Date(
    createdAtReference.getTime() - 1000 * 60 * 60 * 24 * 2,
  ).toISOString();
  const firstUpdateEndDate = new Date(
    createdAtReference.getTime() + 1000 * 60 * 60 * 24 * 60,
  ).toISOString();
  const updated = await api.functional.erpHrmTime.member.projects.update(
    memberConnection,
    {
      projectId: created.id,
      body: {
        name: `${created.name} updated`,
        description: firstUpdateDescription,
        color_code: "#FF6633",
        status: "archived",
        budget_hours: 250,
        start_date: firstUpdateStartDate,
        end_date: firstUpdateEndDate,
      } satisfies IErpHrmTimeProject.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals("project id preserved", updated.id, originalProjectId);
  TestValidator.equals(
    "organization preserved",
    updated.organization.id,
    originalOrganizationId,
  );
  TestValidator.equals(
    "project name updated",
    updated.name,
    `${created.name} updated`,
  );
  TestValidator.equals(
    "project description updated",
    updated.description,
    firstUpdateDescription,
  );
  TestValidator.equals("project color updated", updated.colorCode, "#FF6633");
  TestValidator.equals("project status updated", updated.status, "archived");
  TestValidator.equals("budget hours updated", updated.budgetHours, 250);
  TestValidator.equals(
    "start date updated",
    updated.startDate,
    firstUpdateStartDate,
  );
  TestValidator.equals("end date updated", updated.endDate, firstUpdateEndDate);
  TestValidator.equals(
    "created at preserved",
    updated.createdAt,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated record remains undeleted",
    updated.deletedAt === null,
  );
  const secondUpdateName = `${created.name} final`;
  const secondUpdateColor = "#11CC88";
  const secondUpdateBudget = 300;
  const renamed = await api.functional.erpHrmTime.member.projects.update(
    memberConnection,
    {
      projectId: created.id,
      body: {
        name: secondUpdateName,
        description: null,
        color_code: secondUpdateColor,
        status: "completed",
        budget_hours: secondUpdateBudget,
        start_date: null,
        end_date: null,
      } satisfies IErpHrmTimeProject.IUpdate,
    },
  );
  typia.assert(renamed);
  TestValidator.equals(
    "renamed project id preserved",
    renamed.id,
    originalProjectId,
  );
  TestValidator.equals(
    "renamed organization preserved",
    renamed.organization.id,
    originalOrganizationId,
  );
  TestValidator.equals(
    "final project name persisted",
    renamed.name,
    secondUpdateName,
  );
  TestValidator.equals(
    "final project description persisted",
    renamed.description,
    null,
  );
  TestValidator.equals(
    "final project color persisted",
    renamed.colorCode,
    secondUpdateColor,
  );
  TestValidator.equals(
    "final project status persisted",
    renamed.status,
    "completed",
  );
  TestValidator.equals(
    "final project budget persisted",
    renamed.budgetHours,
    secondUpdateBudget,
  );
  TestValidator.equals(
    "final project start date persisted",
    renamed.startDate,
    null,
  );
  TestValidator.equals(
    "final project end date persisted",
    renamed.endDate,
    null,
  );
  TestValidator.equals(
    "final createdAt preserved",
    renamed.createdAt,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "final record remains undeleted",
    renamed.deletedAt === null,
  );
}
