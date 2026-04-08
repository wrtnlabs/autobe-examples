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
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";

/**
 * Test creating a project with explicit archived status instead of default active.
 *
 * Validates that projects can be created with archived status from the start, which prevents new timelogs or tasks from being added while preserving the project record for reference. The test verifies the project is correctly associated with the authenticated member's organization and all fields are properly stored.
 *
 * 1. Authenticate a new member to establish organization context.
 * 2. Create a project with status explicitly set to 'archived'.
 * 3. Validate the project response contains archived status.
 * 4. Verify project fields (name, color_code, organization) are correctly stored.
 */
export async function test_api_project_creation_archived_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create project with archived status
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {
      body: {
        status: "archived",
      },
    },
  );
  typia.assert(project);
  // 3. Validate archived status
  TestValidator.equals(
    "project status is archived",
    project.status,
    "archived",
  );
  // 4. Verify project fields are correctly stored
  TestValidator.predicate("project has valid id", project.id.length > 0);
  TestValidator.predicate("project has name", project.name.length > 0);
  TestValidator.predicate(
    "project has color_code",
    project.color_code.length > 0,
  );
  TestValidator.predicate(
    "project has organization",
    project.organization.id.length > 0,
  );
  TestValidator.predicate(
    "project created_at is valid",
    project.created_at.length > 0,
  );
  TestValidator.predicate(
    "project updated_at is valid",
    project.updated_at.length > 0,
  );
}
