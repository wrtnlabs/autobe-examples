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
import { generate_random_erp_hrm_time_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_member_organizations_create";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { prepare_random_erp_hrm_time_organization } from "../../../prepare/prepare_random_erp_hrm_time_organization";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";

export async function test_api_project_create_with_lifecycle_metadata(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const organization =
    await generate_random_erp_hrm_time_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logoImageUrl: null,
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const activeBody = {
    name: `project-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    colorCode: `#${RandomGenerator.alphaNumeric(6)}`,
    status: "active",
    budgetHours: 120,
    startDate: new Date().toISOString(),
    endDate: null,
  } satisfies IErpHrmTimeProject.ICreate;
  const activeProject =
    await generate_random_erp_hrm_time_member_projects_create(
      memberConnection,
      {
        body: activeBody,
      },
    );
  typia.assert(activeProject);
  TestValidator.equals(
    "active project name",
    activeProject.name,
    activeBody.name,
  );
  TestValidator.equals(
    "active project description",
    activeProject.description,
    activeBody.description,
  );
  TestValidator.equals(
    "active project color code",
    activeProject.colorCode,
    activeBody.colorCode,
  );
  TestValidator.equals(
    "active project status",
    activeProject.status,
    activeBody.status,
  );
  TestValidator.equals(
    "active project budget hours",
    activeProject.budgetHours,
    activeBody.budgetHours,
  );
  TestValidator.equals(
    "active project start date",
    activeProject.startDate,
    activeBody.startDate,
  );
  TestValidator.equals(
    "active project end date",
    activeProject.endDate,
    activeBody.endDate,
  );
  TestValidator.predicate(
    "active project createdAt exists",
    activeProject.createdAt.length > 0,
  );
  TestValidator.predicate(
    "active project updatedAt exists",
    activeProject.updatedAt.length > 0,
  );
  const plannedBody = {
    name: `planned-${RandomGenerator.alphabets(8)}`,
    description: null,
    colorCode: `#${RandomGenerator.alphaNumeric(6)}`,
    status: "archived",
    budgetHours: null,
    startDate: null,
    endDate: null,
  } satisfies IErpHrmTimeProject.ICreate;
  const plannedProject =
    await generate_random_erp_hrm_time_member_projects_create(
      memberConnection,
      {
        body: plannedBody,
      },
    );
  typia.assert(plannedProject);
  TestValidator.equals(
    "planned project name",
    plannedProject.name,
    plannedBody.name,
  );
  TestValidator.equals(
    "planned project description",
    plannedProject.description,
    plannedBody.description,
  );
  TestValidator.equals(
    "planned project color code",
    plannedProject.colorCode,
    plannedBody.colorCode,
  );
  TestValidator.equals(
    "planned project status",
    plannedProject.status,
    plannedBody.status,
  );
  TestValidator.equals(
    "planned project budget hours",
    plannedProject.budgetHours,
    plannedBody.budgetHours,
  );
  TestValidator.equals(
    "planned project start date",
    plannedProject.startDate,
    plannedBody.startDate,
  );
  TestValidator.equals(
    "planned project end date",
    plannedProject.endDate,
    plannedBody.endDate,
  );
  TestValidator.notEquals(
    "project ids should differ",
    activeProject.id,
    plannedProject.id,
  );
  TestValidator.notEquals(
    "project createdAt should differ",
    activeProject.createdAt,
    plannedProject.createdAt,
  );
}
