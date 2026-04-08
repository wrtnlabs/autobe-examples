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
 * Test updating a project's basic attributes including name, description, color code, and budget hours.
 *
 * Validates the complete project update workflow including member authentication, organization creation, project creation, and project attribute modification. Ensures that the project correctly reflects updated values while maintaining immutable fields like id and created_at.
 *
 * Special attention is given to verifying that the updated_at timestamp changes while created_at remains unchanged, and that the project maintains its organizational context throughout the update operation.
 *
 * 1. Member registers and authenticates using authorize_member_join utility.
 * 2. Organization is created using generate_random_hrm_time_track_member_organizations_create utility.
 * 3. Project is created with initial values using generate_random_hrm_time_track_member_projects_create utility.
 * 4. Project is updated with new name, description, color code, and budget hours.
 * 5. Validates that all updated fields reflect new values and timestamps are correct.
 */
export async function test_api_project_update_basic_attributes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create initial project (organization_id removed - auto-associated via auth context)
  const initialProject =
    await generate_random_hrm_time_track_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(initialProject);
  const initialUpdatedAt = initialProject.updated_at;
  // 4. Update project with new attributes
  const updatedProject =
    await api.functional.hrmTimeTrack.member.projects.update(memberConnection, {
      projectId: initialProject.id,
      body: {
        name: "Updated Project Name",
        description: "Updated project description",
        color_code: "#FF5733",
        budget_hours: 160,
        status: "active",
      } satisfies IHrmTimeTrackProject.IUpdate,
    });
  typia.assert(updatedProject);
  // 5. Validate updated fields
  TestValidator.equals(
    "name updated",
    updatedProject.name,
    "Updated Project Name",
  );
  TestValidator.equals(
    "description updated",
    updatedProject.description,
    "Updated project description",
  );
  TestValidator.equals(
    "color_code updated",
    updatedProject.color_code,
    "#FF5733",
  );
  TestValidator.equals(
    "budget_hours updated",
    updatedProject.budget_hours,
    160,
  );
  TestValidator.equals("status maintained", updatedProject.status, "active");
  // 6. Validate immutable fields
  TestValidator.equals("id unchanged", updatedProject.id, initialProject.id);
  TestValidator.equals(
    "created_at unchanged",
    updatedProject.created_at,
    initialProject.created_at,
  );
  TestValidator.equals(
    "organization unchanged",
    updatedProject.organization.id,
    organization.id,
  );
  // 7. Validate updated_at changed
  TestValidator.notEquals(
    "updated_at changed",
    updatedProject.updated_at,
    initialUpdatedAt,
  );
}
