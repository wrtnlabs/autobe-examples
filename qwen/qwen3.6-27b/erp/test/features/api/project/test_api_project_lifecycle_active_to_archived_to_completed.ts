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
 * Test the full project lifecycle transition from Active to Archived to Completed.
 *
 * Validates the complete project lifecycle workflow ensuring projects can progress through valid one-way status transitions. A new member is registered, a project is created in Active status, then transitions to Archived and finally to Completed state. Verifies each transition succeeds according to business rules and that the status field is correctly maintained throughout.
 *
 * Key business rules validated include that Active can transition to Archived, Archived can transition to Completed, and that all transitions are properly persisted and returned by the API.
 *
 * 1. Register and authenticate a new member to access organization project operations.
 * 2. Create a new project which defaults to Active status.
 * 3. Update the project status from Active to Archived, verifying the transition.
 * 4. Update the project status from Archived to Completed, verifying final state.
 */
export async function test_api_project_lifecycle_active_to_archived_to_completed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a new project (defaults to Active status)
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  TestValidator.equals(
    "initial project status is Active",
    project.status,
    "Active",
  );
  // 3. Transition from Active to Archived
  const archivedBody = {
    status: "Archived",
  } satisfies IHrmPlatformProject.IUpdate;
  const archivedProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project.id,
      body: archivedBody,
    });
  typia.assert(archivedProject);
  TestValidator.equals(
    "transitioned to Archived status",
    archivedProject.status,
    "Archived",
  );
  // 4. Transition from Archived to Completed
  const completedBody = {
    status: "Completed",
  } satisfies IHrmPlatformProject.IUpdate;
  const completedProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: archivedProject.id,
      body: completedBody,
    });
  typia.assert(completedProject);
  TestValidator.equals(
    "transitioned to Completed status",
    completedProject.status,
    "Completed",
  );
}
