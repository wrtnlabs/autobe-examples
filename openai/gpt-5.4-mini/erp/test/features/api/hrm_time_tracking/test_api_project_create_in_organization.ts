import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";

export async function test_api_project_create_in_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const startDate = new Date();
  const endDate = new Date(
    startDate.getTime() + 1000 * 60 * 60 * 24 * 14,
  ).toISOString();
  const description = RandomGenerator.paragraph({ sentences: 2 });
  const name = `project-${RandomGenerator.alphaNumeric(12)}`;
  const project = await api.functional.hrmTimeTracking.member.projects.create(
    memberConnection,
    {
      body: {
        name,
        description,
        colorCode: "#12AB34",
        status: "active",
        budgetHours: 120,
        startDate: startDate.toISOString(),
        endDate,
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(project);
  TestValidator.equals("project name should match input", project.name, name);
  TestValidator.equals(
    "project description should match input",
    project.description,
    description,
  );
  TestValidator.equals(
    "project color code should match input",
    project.colorCode,
    "#12AB34",
  );
  TestValidator.equals(
    "project status should match input",
    project.status,
    "active",
  );
  TestValidator.equals(
    "project budget hours should match input",
    project.budgetHours,
    120,
  );
  TestValidator.equals(
    "project start date should match input",
    project.startDate,
    startDate.toISOString(),
  );
  TestValidator.equals(
    "project end date should match input",
    project.endDate,
    endDate,
  );
  TestValidator.predicate(
    "project organization details should be returned",
    project.organization.name.length > 0,
  );
  TestValidator.predicate(
    "project should not be soft deleted on creation",
    project.deletedAt === null,
  );
}
