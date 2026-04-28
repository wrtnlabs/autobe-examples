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

export async function test_api_project_transition_to_completed(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member to access organization project operations
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: undefined });
  // 2. Create a new project that defaults to Active status
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    { body: undefined },
  );
  typia.assert(project);
  TestValidator.equals(
    "project starts with active status",
    project.status,
    "Active",
  );
  // 3. Update the project status to 'Completed'
  const updatedProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project.id,
      body: { status: "Completed" } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(updatedProject);
  // 4. Verify the lifecycle transition and data integrity
  TestValidator.equals(
    "project status successfully transitions to completed",
    updatedProject.status,
    "Completed",
  );
  TestValidator.equals(
    "project id remains invariant after transition",
    updatedProject.id,
    project.id,
  );
  TestValidator.equals(
    "project name preserved during status transition",
    updatedProject.name,
    project.name,
  );
  TestValidator.equals(
    "project color code preserved during status transition",
    updatedProject.color_code,
    project.color_code,
  );
}
