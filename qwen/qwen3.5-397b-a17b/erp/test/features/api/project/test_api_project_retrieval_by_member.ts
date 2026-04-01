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

export async function test_api_project_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication via join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create an active project with optional fields set
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        color_code: "#3498db",
        status: "active",
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<1000>
        >(),
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Retrieve the project by its ID
  const retrievedProject = await api.functional.hrmPlatform.member.projects.at(
    memberConnection,
    {
      projectId: project.id,
    },
  );
  typia.assert(retrievedProject);
  // 4. Validate required project fields match
  TestValidator.equals("project id matches", retrievedProject.id, project.id);
  TestValidator.equals(
    "project name matches",
    retrievedProject.name,
    project.name,
  );
  TestValidator.equals(
    "project color_code matches",
    retrievedProject.color_code,
    project.color_code,
  );
  TestValidator.equals(
    "project status matches",
    retrievedProject.status,
    "active",
  );
  // 5. Validate optional fields when set
  TestValidator.equals(
    "project description matches",
    retrievedProject.description,
    project.description,
  );
  TestValidator.equals(
    "project budget_hours matches",
    retrievedProject.budget_hours,
    project.budget_hours,
  );
  TestValidator.equals(
    "project start_date matches",
    retrievedProject.start_date,
    project.start_date,
  );
  TestValidator.equals(
    "project end_date matches",
    retrievedProject.end_date,
    project.end_date,
  );
  // 6. Validate organization context
  TestValidator.equals(
    "organization id matches",
    retrievedProject.organization.id,
    project.organization.id,
  );
  TestValidator.equals(
    "organization name matches",
    retrievedProject.organization.name,
    project.organization.name,
  );
  TestValidator.equals(
    "organization currency matches",
    retrievedProject.organization.currency,
    project.organization.currency,
  );
  TestValidator.equals(
    "organization timezone matches",
    retrievedProject.organization.timezone,
    project.organization.timezone,
  );
  // 7. Validate timestamps are valid date-time strings
  TestValidator.predicate(
    "created_at is valid date-time",
    () => new Date(retrievedProject.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => new Date(retrievedProject.updated_at).getTime() > 0,
  );
}
