import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";

export async function test_api_project_create_with_organization_context_isolation(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const startDate = new Date().toISOString();
  const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const sharedPrefix = `org-scope-project-${RandomGenerator.alphaNumeric(8)}`;
  const firstBody = {
    name: `${sharedPrefix}-active`,
    description: RandomGenerator.content({ paragraphs: 2 }),
    color_code: "#1a2b3c",
    status: "active",
    budget_hours: 120,
    start_date: startDate,
    end_date: endDate,
  } satisfies IHrmTimeTrackingProject.ICreate;
  const firstProject = await generate_random_hrm_time_tracking_projects_create(
    actorConnection,
    {
      body: firstBody,
    },
  );
  typia.assert(firstProject);
  TestValidator.equals(
    "first project name matches input",
    firstProject.name,
    firstBody.name,
  );
  TestValidator.equals(
    "first project description matches input",
    firstProject.description,
    firstBody.description,
  );
  TestValidator.equals(
    "first project color matches input",
    firstProject.colorCode,
    firstBody.color_code,
  );
  TestValidator.equals(
    "first project status matches input",
    firstProject.status,
    firstBody.status,
  );
  TestValidator.equals(
    "first project budget hours matches input",
    firstProject.budgetHours,
    firstBody.budget_hours,
  );
  TestValidator.equals(
    "first project start date matches input",
    firstProject.startDate,
    firstBody.start_date,
  );
  TestValidator.equals(
    "first project end date matches input",
    firstProject.endDate,
    firstBody.end_date,
  );
  const secondBody = {
    name: `${sharedPrefix}-archived`,
    description: firstBody.description,
    color_code: "#4d5e6f",
    status: "archived",
    budget_hours: 240,
    start_date: startDate,
    end_date: endDate,
  } satisfies IHrmTimeTrackingProject.ICreate;
  const secondProject = await generate_random_hrm_time_tracking_projects_create(
    actorConnection,
    {
      body: secondBody,
    },
  );
  typia.assert(secondProject);
  TestValidator.equals(
    "second project name matches input",
    secondProject.name,
    secondBody.name,
  );
  TestValidator.equals(
    "second project description matches input",
    secondProject.description,
    secondBody.description,
  );
  TestValidator.equals(
    "second project color matches input",
    secondProject.colorCode,
    secondBody.color_code,
  );
  TestValidator.equals(
    "second project status matches input",
    secondProject.status,
    secondBody.status,
  );
  TestValidator.equals(
    "second project budget hours matches input",
    secondProject.budgetHours,
    secondBody.budget_hours,
  );
  TestValidator.equals(
    "second project start date matches input",
    secondProject.startDate,
    secondBody.start_date,
  );
  TestValidator.equals(
    "second project end date matches input",
    secondProject.endDate,
    secondBody.end_date,
  );
  TestValidator.notEquals(
    "created projects must be different records",
    firstProject.id,
    secondProject.id,
  );
  TestValidator.notEquals(
    "created projects must keep distinct names",
    firstProject.name,
    secondProject.name,
  );
  TestValidator.notEquals(
    "created projects must keep distinct statuses",
    firstProject.status,
    secondProject.status,
  );
  TestValidator.equals(
    "projects created in the same active context should share organization ownership",
    firstProject.organization.id,
    secondProject.organization.id,
  );
  TestValidator.equals(
    "organization summary should remain consistent for same-context creations",
    firstProject.organization,
    secondProject.organization,
  );
}
