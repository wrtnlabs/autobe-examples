import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
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

export async function test_api_project_update_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234Aa!!",
      name: RandomGenerator.name(),
      href: "https://example.com/erp-hrm-time/join",
      referrer: "https://example.com/erp-hrm-time/signup",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(registered);
  const created = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#2F80ED",
        status: "active",
        budgetHours: 120,
        startDate: new Date("2026-04-01T00:00:00.000Z").toISOString(),
        endDate: new Date("2026-06-30T00:00:00.000Z").toISOString(),
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(created);
  const firstUpdatedAt = created.updatedAt;
  const firstUpdateBody = {
    name: `${created.name} updated`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    colorCode: "#27AE60",
    status: "active",
    budgetHours: 240,
    startDate: new Date("2026-04-02T00:00:00.000Z").toISOString(),
    endDate: new Date("2026-07-31T00:00:00.000Z").toISOString(),
  } satisfies IErpHrmTimeProject.IUpdate;
  const updated = await api.functional.erpHrmTime.member.projects.update(
    memberConnection,
    {
      projectId: created.id,
      body: firstUpdateBody,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "project id should remain the same",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "organization should remain the same",
    updated.organization,
    created.organization,
  );
  TestValidator.equals(
    "project name should update",
    updated.name,
    firstUpdateBody.name,
  );
  TestValidator.equals(
    "project description should update",
    updated.description,
    firstUpdateBody.description,
  );
  TestValidator.equals(
    "project color should update",
    updated.colorCode,
    firstUpdateBody.colorCode,
  );
  TestValidator.equals(
    "project status should remain active",
    updated.status,
    "active",
  );
  TestValidator.equals(
    "budget hours should update",
    updated.budgetHours,
    firstUpdateBody.budgetHours,
  );
  TestValidator.equals(
    "start date should update",
    updated.startDate,
    firstUpdateBody.startDate,
  );
  TestValidator.equals(
    "end date should update",
    updated.endDate,
    firstUpdateBody.endDate,
  );
  TestValidator.notEquals(
    "updatedAt should refresh",
    updated.updatedAt,
    firstUpdatedAt,
  );
  TestValidator.predicate(
    "createdAt should not be later than updatedAt",
    updated.createdAt <= updated.updatedAt,
  );
  TestValidator.equals(
    "project should remain undeleted",
    updated.deletedAt,
    null,
  );
  const secondUpdatedAt = updated.updatedAt;
  const preservedDescription = updated.description;
  const preservedBudgetHours = updated.budgetHours;
  const preservedStartDate = updated.startDate;
  const preservedEndDate = updated.endDate;
  const secondUpdate = await api.functional.erpHrmTime.member.projects.update(
    memberConnection,
    {
      projectId: created.id,
      body: {
        name: `${updated.name} v2`,
        colorCode: "#F2994A",
        status: "active",
      } satisfies IErpHrmTimeProject.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  TestValidator.equals(
    "project id should remain the same after second update",
    secondUpdate.id,
    created.id,
  );
  TestValidator.equals(
    "organization should remain the same after second update",
    secondUpdate.organization,
    created.organization,
  );
  TestValidator.equals(
    "name should update again",
    secondUpdate.name,
    `${updated.name} v2`,
  );
  TestValidator.equals(
    "omitted description should be preserved",
    secondUpdate.description,
    preservedDescription,
  );
  TestValidator.equals(
    "omitted budget hours should be preserved",
    secondUpdate.budgetHours,
    preservedBudgetHours,
  );
  TestValidator.equals(
    "omitted start date should be preserved",
    secondUpdate.startDate,
    preservedStartDate,
  );
  TestValidator.equals(
    "omitted end date should be preserved",
    secondUpdate.endDate,
    preservedEndDate,
  );
  TestValidator.equals(
    "color should update again",
    secondUpdate.colorCode,
    "#F2994A",
  );
  TestValidator.notEquals(
    "updatedAt should refresh again",
    secondUpdate.updatedAt,
    secondUpdatedAt,
  );
  TestValidator.equals(
    "project should remain undeleted after second update",
    secondUpdate.deletedAt,
    null,
  );
}
