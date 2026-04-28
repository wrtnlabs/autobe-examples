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
 * Test that creating a project with a duplicate name within the same organization is rejected.
 *
 * Validates the organization-level unique name constraint on projects. First creates a project
 * with a given name and verifies successful creation, then attempts to create a second project
 * with the identical name and expects an error to be thrown.
 *
 * 1. Authenticate a new member (auto-creates default organization).
 * 2. Create first project with a unique name - should succeed.
 * 3. Attempt to create second project with same name - should fail with constraint violation.
 */
export async function test_api_project_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member - creates default organization
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create first project with a unique name
  const projectName = RandomGenerator.name();
  const firstProject = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    {
      body: {
        name: projectName,
        color_code: "#FF5733",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(firstProject);
  TestValidator.equals("project name matches", firstProject.name, projectName);
  // 3. Attempt duplicate project creation - should fail
  await TestValidator.error("duplicate project name rejected", async () => {
    await api.functional.hrmPlatform.member.projects.create(memberConnection, {
      body: {
        name: projectName,
        color_code: "#00FF00",
      } satisfies IHrmPlatformProject.ICreate,
    });
  });
}
