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

export async function test_api_project_create_planning_fields_and_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: connection.host,
      referrer: connection.host,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const projectConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  const duplicateName = `project-${RandomGenerator.alphabets(8)}`;
  const firstRequest = {
    name: duplicateName,
    description: null,
    colorCode: "#3366ff",
    status: "active",
    budgetHours: null,
    startDate: null,
    endDate: null,
  } satisfies IErpHrmTimeProject.ICreate;
  const firstProject = await api.functional.erpHrmTime.member.projects.create(
    projectConnection,
    { body: firstRequest },
  );
  typia.assert(firstProject);
  TestValidator.equals(
    "project name should match requested value",
    firstProject.name,
    duplicateName,
  );
  TestValidator.equals(
    "project description should preserve explicit null",
    firstProject.description,
    null,
  );
  TestValidator.equals(
    "project budget hours should preserve explicit null",
    firstProject.budgetHours,
    null,
  );
  TestValidator.equals(
    "project start date should preserve explicit null",
    firstProject.startDate,
    null,
  );
  TestValidator.equals(
    "project end date should preserve explicit null",
    firstProject.endDate,
    null,
  );
  TestValidator.equals(
    "project status should be stored as provided",
    firstProject.status,
    "active",
  );
  TestValidator.equals(
    "project color code should be stored as provided",
    firstProject.colorCode,
    "#3366ff",
  );
  const plannedStartDate = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const plannedEndDate = new Date(
    Date.now() + 10 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const planningDescription = RandomGenerator.paragraph({ sentences: 2 });
  const planningColorCode = "#ff9933";
  const planningHours = 120;
  const plannedProject = await api.functional.erpHrmTime.member.projects.create(
    projectConnection,
    {
      body: {
        name: `${duplicateName}-planning`,
        description: planningDescription,
        colorCode: planningColorCode,
        status: "active",
        budgetHours: planningHours,
        startDate: plannedStartDate,
        endDate: plannedEndDate,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(plannedProject);
  TestValidator.equals(
    "planned project name should match requested value",
    plannedProject.name,
    `${duplicateName}-planning`,
  );
  TestValidator.equals(
    "planned project description should match requested value",
    plannedProject.description,
    planningDescription,
  );
  TestValidator.equals(
    "planned project budget hours should match requested value",
    plannedProject.budgetHours,
    planningHours,
  );
  TestValidator.equals(
    "planned project start date should match requested value",
    plannedProject.startDate,
    plannedStartDate,
  );
  TestValidator.equals(
    "planned project end date should match requested value",
    plannedProject.endDate,
    plannedEndDate,
  );
  TestValidator.equals(
    "planned project status should be stored as provided",
    plannedProject.status,
    "active",
  );
  TestValidator.equals(
    "planned project color code should be stored as provided",
    plannedProject.colorCode,
    planningColorCode,
  );
  await TestValidator.error(
    "duplicate project name in the same organization should be rejected",
    async () => {
      await api.functional.erpHrmTime.member.projects.create(
        projectConnection,
        {
          body: {
            name: duplicateName,
            description: RandomGenerator.paragraph({ sentences: 1 }),
            colorCode: "#112233",
            status: "active",
            budgetHours: 40,
            startDate: null,
            endDate: null,
          } satisfies IErpHrmTimeProject.ICreate,
        },
      );
    },
  );
}
