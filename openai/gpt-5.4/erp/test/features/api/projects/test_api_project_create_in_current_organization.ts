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

export async function test_api_project_create_in_current_organization(
  connection: api.IConnection,
): Promise<void> {
  const projectManagerConnection: api.IConnection = {
    host: connection.host,
  };
  const hex = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
  ] as const;
  const colorCode = `#${ArrayUtil.repeat(6, () => RandomGenerator.pick(hex)).join("")}`;
  const name = `project-${RandomGenerator.name(2)}-${RandomGenerator.alphabets(4)}`;
  const description = RandomGenerator.paragraph({ sentences: 3 });
  const status = RandomGenerator.pick([
    "active",
    "archived",
    "completed",
  ] as const);
  const budgetHours = 120;
  const startDate = new Date().toISOString();
  const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  const created = await generate_random_hrm_time_tracking_projects_create(
    projectManagerConnection,
    {
      body: {
        name,
        description,
        color_code: colorCode,
        status,
        budget_hours: budgetHours,
        start_date: startDate,
        end_date: endDate,
      },
    },
  );
  typia.assert<IHrmTimeTrackingProject>(created);
  TestValidator.equals("project name matches input", created.name, name);
  TestValidator.equals(
    "project description matches input",
    created.description,
    description,
  );
  TestValidator.equals(
    "project color code matches input",
    created.colorCode,
    colorCode,
  );
  TestValidator.equals("project status matches input", created.status, status);
  TestValidator.equals(
    "project budget hours matches input",
    created.budgetHours,
    budgetHours,
  );
  TestValidator.equals(
    "project start date matches input",
    created.startDate,
    startDate,
  );
  TestValidator.equals(
    "project end date matches input",
    created.endDate,
    endDate,
  );
  TestValidator.equals(
    "project is not soft deleted on creation",
    created.deletedAt,
    null,
  );
  TestValidator.predicate("project id is populated", created.id.length > 0);
  TestValidator.predicate(
    "project createdAt is populated",
    created.createdAt.length > 0,
  );
  TestValidator.predicate(
    "project updatedAt is populated",
    created.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "organization summary is attached",
    created.organization.id.length > 0 && created.organization.name.length > 0,
  );
  TestValidator.predicate(
    "created project is a normal downstream-usable project",
    created.deletedAt === null &&
      created.organization.id.length > 0 &&
      created.name === name,
  );
}
