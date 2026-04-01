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

export async function test_api_project_create_in_selected_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234!",
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const ownerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.access },
  };
  const organization =
    await api.functional.erpHrmTime.member.organizations.create(
      ownerConnection,
      {
        body: {
          name: `Org ${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logoImageUrl: null,
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const statuses = ["active", "archived", "completed"] as const;
  const projects = await ArrayUtil.asyncMap(statuses, async (status) => {
    const created = await api.functional.erpHrmTime.member.projects.create(
      ownerConnection,
      {
        body: {
          name: `Project ${status} ${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          colorCode: `#${RandomGenerator.alphabets(6)}`,
          status,
          budgetHours: 120,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        } satisfies IErpHrmTimeProject.ICreate,
      },
    );
    typia.assert(created);
    return created;
  });
  TestValidator.equals(
    "created project count",
    projects.length,
    statuses.length,
  );
  TestValidator.equals(
    "project 1 name preserved",
    projects[0].name.startsWith("Project active"),
    true,
  );
  TestValidator.equals(
    "project 2 name preserved",
    projects[1].name.startsWith("Project archived"),
    true,
  );
  TestValidator.equals(
    "project 3 name preserved",
    projects[2].name.startsWith("Project completed"),
    true,
  );
  TestValidator.equals("project 1 status", projects[0].status, "active");
  TestValidator.equals("project 2 status", projects[1].status, "archived");
  TestValidator.equals("project 3 status", projects[2].status, "completed");
  TestValidator.equals(
    "project 1 description preserved",
    typeof projects[0].description,
    "string",
  );
  TestValidator.equals(
    "project 2 description preserved",
    typeof projects[1].description,
    "string",
  );
  TestValidator.equals(
    "project 3 description preserved",
    typeof projects[2].description,
    "string",
  );
  TestValidator.equals("project 1 budget", projects[0].budgetHours, 120);
  TestValidator.equals("project 2 budget", projects[1].budgetHours, 120);
  TestValidator.equals("project 3 budget", projects[2].budgetHours, 120);
  TestValidator.predicate(
    "project identifiers are created",
    projects.every((project) => project.id.length > 0),
  );
  TestValidator.predicate(
    "timestamps are populated",
    projects.every(
      (project) =>
        project.createdAt.length > 0 &&
        project.updatedAt.length > 0 &&
        project.deletedAt === null,
    ),
  );
  TestValidator.equals(
    "project start date preserved",
    projects[0].startDate !== null &&
      projects[1].startDate !== null &&
      projects[2].startDate !== null,
    true,
  );
  TestValidator.equals(
    "project end date preserved",
    projects[0].endDate !== null &&
      projects[1].endDate !== null &&
      projects[2].endDate !== null,
    true,
  );
  TestValidator.predicate(
    "created projects are usable for later workflows",
    projects.every(
      (project) => project.name.length > 0 && project.colorCode.length > 0,
    ),
  );
  const selectedProject =
    await api.functional.erpHrmTime.member.projects.create(ownerConnection, {
      body: {
        name: `Selected ${RandomGenerator.alphabets(8)}`,
        description: null,
        colorCode: "#3366ff",
        status: "active",
        budgetHours: null,
        startDate: null,
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    });
  typia.assert(selectedProject);
  TestValidator.equals(
    "selected project name",
    selectedProject.name.startsWith("Selected "),
    true,
  );
  TestValidator.equals(
    "selected project status",
    selectedProject.status,
    "active",
  );
  TestValidator.equals(
    "selected project budget",
    selectedProject.budgetHours,
    null,
  );
  TestValidator.equals(
    "selected project description",
    selectedProject.description,
    null,
  );
}
