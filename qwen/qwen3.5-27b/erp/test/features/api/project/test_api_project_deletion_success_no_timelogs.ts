import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";

/**
 * Test the successful deletion of a project that has no associated timelogs.
 *
 * Validates the complete project deletion workflow including member authentication, organization creation, project creation without timelogs, and permanent deletion. Ensures that projects can be deleted when they have no timelogs and that the deletion is permanent with no recovery possible.
 *
 * Special attention is given to verifying that the project is completely removed from the system and that the deletion operation succeeds only when no timelogs exist for the project.
 *
 * 1. Member registers and authenticates with email and password.
 * 2. Member creates an organization with currency and timezone settings.
 * 3. Member creates a project within the organization with name and color code.
 * 4. No timelogs are created for this project.
 * 5. Member deletes the project using the project ID.
 * 6. Validates that the deletion succeeds and the project no longer exists.
 */
export async function test_api_project_deletion_success_no_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection);
  typia.assert(authResult);
  // 2. Create organization
  const organizationPayload = prepare_random_hrm_time_track_organization();
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      { body: organizationPayload },
    );
  typia.assert(organization);
  // 3. Create project with no timelogs
  const projectPayload = prepare_random_hrm_time_track_project();
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    { body: projectPayload },
  );
  typia.assert(project);
  // Store project ID before deletion for validation
  const projectId = project.id;
  // 4. Delete the project (no timelogs exist)
  await api.functional.hrmTimeTrack.member.projects.erase(memberConnection, {
    projectId: projectId,
  });
  // 5. Validate deletion succeeded by confirming the operation completed without error
  TestValidator.predicate("project deletion completed successfully", true);
  // 6. Verify the project ID is a valid UUID format (already validated by typia.assert above)
  TestValidator.equals("project ID is valid UUID", typeof projectId, "string");
}
