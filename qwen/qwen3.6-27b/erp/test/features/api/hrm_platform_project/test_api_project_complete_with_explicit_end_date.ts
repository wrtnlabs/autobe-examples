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

/**
 * Test completing a project while providing an explicit end_date value.
 *
 * Validates the project completion workflow when a specific end date is explicitly provided in the request body. Ensures that the project status transitions from active to completed, the end_date field is set to the provided datetime value rather than auto-defaulting to the current timestamp, and the updated_at timestamp reflects the modification. All other project fields are preserved unchanged.
 *
 * 1. Authenticates as a member to gain access to organizational features.
 * 2. Creates a new active project with name, color_code, description, budget, and start_date.
 * 3. Completes the project by calling the complete endpoint with an explicit end_date value.
 * 4. Validates that the response contains the updated project with status 'completed', end_date matching the explicit value, updated_at changed, and all other fields preserved.
 */
export async function test_api_project_complete_with_explicit_end_date(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: undefined });
  // 2. Create a new active project
  const plannedStartDate = typia.random<string & tags.Format<"date-time">>();
  const project = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
        description: RandomGenerator.paragraph({ sentences: 2 }),
        budget: typia.random<number>(),
        start_date: plannedStartDate,
        end_date: null,
      },
    },
  );
  typia.assert(project);
  // 3. Complete the project with an explicit end_date
  const explicitEndDate = typia.random<string & tags.Format<"date-time">>();
  const completedProject =
    await api.functional.hrmPlatform.member.projects.complete(
      memberConnection,
      {
        projectId: project.id,
        body: {
          end_date: explicitEndDate,
        } satisfies IHrmPlatformProject.ICompleteRequest,
      },
    );
  typia.assert(completedProject);
  // 4. Validate the response
  TestValidator.equals(
    "status changed to completed",
    completedProject.status,
    "completed",
  );
  TestValidator.equals(
    "end_date set to explicit value",
    completedProject.end_date,
    explicitEndDate,
  );
  TestValidator.predicate(
    "updated_at timestamp changed",
    completedProject.updated_at !== project.updated_at,
  );
  TestValidator.equals(
    "name preserved unchanged",
    completedProject.name,
    project.name,
  );
  TestValidator.equals(
    "color_code preserved unchanged",
    completedProject.color_code,
    project.color_code,
  );
  TestValidator.equals(
    "description preserved unchanged",
    completedProject.description,
    project.description,
  );
  TestValidator.equals(
    "budget preserved unchanged",
    completedProject.budget,
    project.budget,
  );
  TestValidator.equals(
    "start_date preserved unchanged",
    completedProject.start_date,
    project.start_date,
  );
}
