import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
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

export async function test_api_project_creation_with_budget_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member for API access
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Create member-specific connection for authenticated requests
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: joinResult.token.access,
  };
  // 3. Prepare project creation data with all fields including optional description and budget_hours
  const descriptionText = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  // Ensure description is within 1000 character limit
  const validatedDescription =
    descriptionText.length > 1000
      ? descriptionText.substring(0, 1000)
      : descriptionText;
  const projectName = RandomGenerator.name(3);
  const projectColorCode = `#${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const projectBudgetHours = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>
  >();
  // 4. Create project with all fields
  const project = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    {
      body: {
        name: projectName,
        color_code: projectColorCode,
        description: validatedDescription satisfies string | null | undefined,
        budget_hours: projectBudgetHours satisfies number | null | undefined,
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 5. Validate project fields match input
  TestValidator.equals("project name matches input", project.name, projectName);
  TestValidator.equals(
    "color code matches input",
    project.color_code,
    projectColorCode,
  );
  TestValidator.equals(
    "description matches input",
    project.description,
    validatedDescription,
  );
  TestValidator.equals(
    "budget_hours matches input",
    project.budget_hours,
    projectBudgetHours,
  );
  TestValidator.equals("project status is active", project.status, "active");
  TestValidator.equals(
    "organization context is linked",
    project.organization.id,
    joinResult.member.id,
  );
  TestValidator.predicate(
    "description within 1000 character limit",
    project.description !== undefined &&
      project.description !== null &&
      project.description.length <= 1000,
  );
  TestValidator.predicate(
    "budget_hours is positive number",
    project.budget_hours !== undefined &&
      project.budget_hours !== null &&
      project.budget_hours > 0,
  );
}
