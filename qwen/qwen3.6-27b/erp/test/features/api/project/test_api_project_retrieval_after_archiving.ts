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
 * Test that archived projects remain retrievable after lifecycle transition.
 *
 * Validates that projects can be successfully archived and remain accessible via direct retrieval. After archiving, the project's status field should reflect the archived lifecycle state while preserving all other fields including name, description, color_code, budget, and organization summary. This ensures archival is a lifecycle transition rather than a deletion operation.
 *
 * 1. Member authenticates and joins the platform.
 * 2. Member creates a new project within their organization context.
 * 3. Member archives the created project, transitioning its status to archived.
 * 4. Member retrieves the archived project by ID to confirm it remains accessible.
 * 5. Validates that the retrieved project status is 'Archived' and fields are preserved.
 */
export async function test_api_project_retrieval_after_archiving(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a project
  const createdProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(createdProject);
  // 3. Archive the project
  const archivedProject =
    await api.functional.hrmPlatform.member.projects.archive(memberConnection, {
      projectId: createdProject.id,
    });
  typia.assert(archivedProject);
  TestValidator.equals("archived status", archivedProject.status, "Archived");
  // 4. Retrieve the archived project by ID
  const retrievedProject = await api.functional.hrmPlatform.member.projects.at(
    memberConnection,
    { projectId: archivedProject.id },
  );
  typia.assert(retrievedProject);
  // 5. Validate that retrieved project reflects archived status
  TestValidator.equals(
    "retrieved project status is archived",
    retrievedProject.status,
    "Archived",
  );
  TestValidator.equals(
    "retrieved project name preserved",
    retrievedProject.name,
    createdProject.name,
  );
  TestValidator.predicate(
    "organization summary included",
    retrievedProject.organization != null &&
      retrievedProject.organization.id != null,
  );
}
