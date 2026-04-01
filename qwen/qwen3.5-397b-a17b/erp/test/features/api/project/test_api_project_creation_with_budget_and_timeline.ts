import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

export async function test_api_project_creation_with_budget_and_timeline(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Prepare project creation data with all fields
  const now = new Date();
  const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days later
  const projectInput = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    color_code: "#3498db",
    status: "active",
    budget_hours: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<1000>
    >(),
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
  } satisfies IHrmPlatformProject.ICreate;
  // 3. Create project using utility function
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: projectInput,
    },
  );
  typia.assert(project);
  // 4. Validate required fields match input
  TestValidator.equals("project name matches", project.name, projectInput.name);
  TestValidator.equals(
    "color code matches",
    project.color_code,
    projectInput.color_code,
  );
  TestValidator.equals("status matches", project.status, projectInput.status);
  // 5. Validate optional fields match input
  TestValidator.equals(
    "description matches",
    project.description,
    projectInput.description,
  );
  TestValidator.equals(
    "budget hours matches",
    project.budget_hours,
    projectInput.budget_hours,
  );
  TestValidator.equals(
    "start date matches",
    project.start_date,
    projectInput.start_date,
  );
  TestValidator.equals(
    "end date matches",
    project.end_date,
    projectInput.end_date,
  );
  // 6. Validate organization information is present with required fields
  TestValidator.predicate(
    "organization has id",
    project.organization.id.length > 0,
  );
  TestValidator.predicate(
    "organization has name",
    project.organization.name.length > 0,
  );
  TestValidator.predicate(
    "organization has currency",
    project.organization.currency.length > 0,
  );
  TestValidator.predicate(
    "organization has timezone",
    project.organization.timezone.length > 0,
  );
  // 7. Validate budget_hours is within expected range
  if (project.budget_hours !== null && project.budget_hours !== undefined) {
    TestValidator.predicate(
      "budget hours is positive",
      project.budget_hours > 0,
    );
    TestValidator.predicate(
      "budget hours is within range",
      project.budget_hours >= 10 && project.budget_hours <= 1000,
    );
  }
  // 8. Validate timeline dates are properly ordered
  if (
    project.start_date !== null &&
    project.start_date !== undefined &&
    project.end_date !== null &&
    project.end_date !== undefined
  ) {
    const startTimestamp = new Date(project.start_date).getTime();
    const endTimestamp = new Date(project.end_date).getTime();
    TestValidator.predicate(
      "end date is after start date",
      endTimestamp > startTimestamp,
    );
  }
}
