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

export async function test_api_project_archive_active(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create an active project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#FF5733",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Archive the project
  const archivedProject = await api.functional.hrmPlatform.member.projects.archive(memberConnection, {
    projectId: project.id,
  });
  typia.assert(archivedProject);
  // 4. Validate the archive operation
  TestValidator.equals(
    "status is archived",
    archivedProject.status,
    "archived",
  );
  TestValidator.predicate("other fields preserved", () => {
    return (
      archivedProject.name === project.name &&
      archivedProject.description === project.description &&
      archivedProject.color_code === project.color_code &&
      archivedProject.budget === project.budget &&
      archivedProject.start_date === project.start_date &&
      archivedProject.end_date === project.end_date &&
      archivedProject.created_at === project.created_at &&
      archivedProject.organization.id === project.organization.id &&
      archivedProject.deleted_at === project.deleted_at
    );
  });
  TestValidator.predicate(
    "updated_at is refreshed",
    () => archivedProject.updated_at !== project.updated_at,
  );
}