import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
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
 * Test that an authenticated member can successfully retrieve detailed information about a project they have access to.
 * Validates the primary success path for project retrieval including response structure, field accuracy, and organization scoping.
 */
export async function test_api_project_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project
  const createdProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(createdProject);
  // 3. Retrieve the project by ID
  const retrievedProject = await api.functional.hrmPlatform.member.projects.at(
    memberConnection,
    {
      projectId: createdProject.id,
    },
  );
  typia.assert(retrievedProject);
  // 4. Validate project fields match creation data
  TestValidator.equals(
    "project name matches",
    retrievedProject.name,
    createdProject.name,
  );
  TestValidator.equals(
    "project status matches",
    retrievedProject.status,
    createdProject.status,
  );
  TestValidator.equals(
    "project color_code matches",
    retrievedProject.color_code,
    createdProject.color_code,
  );
  // 5. Validate optional fields
  if (createdProject.budget_hours !== undefined) {
    TestValidator.equals(
      "budget_hours matches",
      retrievedProject.budget_hours,
      createdProject.budget_hours,
    );
  }
  if (createdProject.description !== undefined) {
    TestValidator.equals(
      "description matches",
      retrievedProject.description,
      createdProject.description,
    );
  }
  // 6. Validate timestamps exist
  TestValidator.predicate(
    "created_at exists",
    retrievedProject.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedProject.updated_at !== undefined,
  );
  // 7. Validate organization is properly linked
  TestValidator.predicate(
    "organization exists",
    retrievedProject.organization !== undefined,
  );
  TestValidator.equals(
    "organization id matches",
    retrievedProject.organization.id,
    createdProject.organization.id,
  );
}
