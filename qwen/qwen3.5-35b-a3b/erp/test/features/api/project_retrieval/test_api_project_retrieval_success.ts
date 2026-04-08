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

/**
 * Test the primary success path for retrieving a project detail.
 *
 * Validates the complete project creation and retrieval flow including member authentication,
 * project creation with required and optional fields, and subsequent project retrieval.
 * Ensures that the project correctly preserves all input data and that computed fields
 * like empty arrays are properly initialized.
 *
 * Special attention is given to verifying that all project metadata (name, color code,
 * budget hours, dates) are correctly stored and returned, and that the project status
 * is initialized to 'ACTIVE' upon creation.
 *
 * 1. Member authentication via join endpoint creates member account and initial organization.
 * 2. Project creation with required name, color_code and optional fields (description, budget_hours, start_date, end_date).
 * 3. Project retrieval using the returned project ID.
 * 4. Validates response matches input and project entity structure, ...
 */
export async function test_api_project_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member and create initial organization
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        avatar_uri: typia.random<string & tags.Format<"uri">>(),
        org_name: RandomGenerator.name(),
        org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        org_description: RandomGenerator.paragraph(),
        org_logo_uri: typia.random<string & tags.Format<"uri">>(),
        org_timezone: RandomGenerator.pick([
          "UTC",
          "Asia/Seoul",
          "America/New_York",
        ]),
        org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create a new project within the organization
  const projectConnection: api.IConnection = { host: connection.host };
  const inputBody = {
    name: RandomGenerator.name(),
    color_code: `#${typia
      .random<number & tags.Type<"uint32">>()
      .toString(16)
      .padStart(6, "0")}`,
    description: RandomGenerator.paragraph(),
    budget_hours: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100>
    >(),
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IHrmPlatformProject.ICreate;
  const project: IHrmPlatformProject =
    await api.functional.hrmPlatform.member.projects.create(projectConnection, {
      body: inputBody,
    });
  typia.assert(project);
  // 3. Retrieve the project by ID
  const retrievedProject: IHrmPlatformProject =
    await api.functional.hrmPlatform.member.projects.at(projectConnection, {
      projectId: project.id,
    });
  typia.assert(retrievedProject);
  // 4. Validate response
  TestValidator.equals("project ID matches", retrievedProject.id, project.id);
  TestValidator.equals(
    "project name matches",
    retrievedProject.name,
    inputBody.name,
  );
  TestValidator.equals(
    "color code matches",
    retrievedProject.color_code,
    inputBody.color_code,
  );
  TestValidator.equals("status is ACTIVE", retrievedProject.status, "ACTIVE");
  TestValidator.equals(
    "description matches",
    retrievedProject.description,
    inputBody.description,
  );
  TestValidator.equals(
    "budget_hours matches",
    retrievedProject.budget_hours,
    inputBody.budget_hours,
  );
  TestValidator.equals(
    "start_date matches",
    retrievedProject.start_date,
    inputBody.start_date,
  );
  TestValidator.equals(
    "end_date matches",
    retrievedProject.end_date,
    inputBody.end_date,
  );
  TestValidator.equals(
    "tasks array initialized",
    retrievedProject.tasks.length,
    0,
  );
  TestValidator.equals(
    "timelogs array initialized",
    retrievedProject.timelogs.length,
    0,
  );
  TestValidator.equals(
    "timers array initialized",
    retrievedProject.timers.length,
    0,
  );
  TestValidator.equals(
    "memberships array initialized",
    retrievedProject.memberships.length,
    0,
  );
  TestValidator.predicate(
    "organization is valid",
    retrievedProject.organization.id !== undefined,
  );
}
