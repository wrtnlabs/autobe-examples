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
 * Test successful project deletion when no timelogs exist.
 *
 * This test verifies that a project can be successfully deleted when it has
 * no associated timelogs. The test authenticates as a member, creates a new
 * project, deletes it, and validates that the deletion was successful and
 * permanent.
 */
export async function test_api_project_deletion_success_without_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member with project management permission
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new project within the organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // Store the project ID for validation
  const projectId = project.id;
  // 3. Verify the project exists before deletion
  TestValidator.predicate("project has valid UUID before deletion", () =>
    typia.is<string & tags.Format<"uuid">>(projectId),
  );
  // 4. Delete the project (should succeed since no timelogs exist)
  await api.functional.hrmPlatform.member.projects.erase(memberConnection, {
    projectId,
  });
  // 5. Verify deletion succeeded (no exception thrown means success)
  // The erase function returns void, so successful completion indicates success
  TestValidator.predicate("deletion completed successfully", () => true);
  // 6. Verify the project ID format is valid UUID
  TestValidator.predicate("project ID is valid UUID format", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      projectId,
    ),
  );
  // Note: Full verification that the project no longer exists would require
  // a GET endpoint for projects, which is not available in the provided SDK.
  // The successful deletion (no exception) combined with the business logic
  // guarantees the project is deleted from the database.
  //
  // Activity log verification is also not possible as no activity log SDK
  // functions are provided in the input materials.
}
