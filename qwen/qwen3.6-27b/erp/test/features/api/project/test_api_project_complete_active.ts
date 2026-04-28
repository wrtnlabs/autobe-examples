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

export async function test_api_project_complete_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create a new active project
  const project = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#FF5733",
        description: RandomGenerator.content({ paragraphs: 3 }),
        budget: typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>(),
        start_date: new Date().toISOString(),
      },
    },
  );
  typia.assert(project);
  TestValidator.equals(
    "status of newly created project is Active",
    project.status,
    "Active",
  );
  // 3. Complete the project (without end_date, letting the system auto-set it)
  const completedProject =
    await api.functional.hrmPlatform.member.projects.complete(
      memberConnection,
      {
        projectId: project.id,
        body: {
          end_date: undefined,
        },
      },
    );
  typia.assert(completedProject);
  // 4. Validate that the project status is now 'Completed'
  TestValidator.equals(
    "project status is Completed",
    completedProject.status,
    "Completed",
  );
  // 5. Validate that end_date was automatically set by the system
  TestValidator.predicate(
    "end_date is set",
    completedProject.end_date !== null,
  );
  // 6. Validate that updated_at was updated (is greater than or equal to created_at)
  TestValidator.predicate(
    "updated_at is at or after created_at",
    new Date(completedProject.updated_at) >=
      new Date(completedProject.created_at),
  );
  // 7. Validate that all other fields are preserved unchanged
  TestValidator.equals("name preserved", completedProject.name, project.name);
  TestValidator.equals(
    "color_code preserved",
    completedProject.color_code,
    project.color_code,
  );
  TestValidator.equals(
    "description preserved",
    completedProject.description,
    project.description,
  );
  TestValidator.equals(
    "budget preserved",
    completedProject.budget,
    project.budget,
  );
  TestValidator.equals(
    "start_date preserved",
    completedProject.start_date,
    project.start_date,
  );
  TestValidator.equals(
    "organization matches preserved",
    completedProject.organization.id,
    project.organization.id,
  );
}
