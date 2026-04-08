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
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";

/**
 * Test cross-organization data isolation by attempting to access a project from a different organization.
 *
 * Validates that the system correctly enforces organization-based data isolation boundaries. Member B from organization B should be unable to access projects belonging to organization A, ensuring proper multi-tenancy security.
 *
 * The test sets up two independent organizational contexts with separate members, organizations, employees, and projects. It then attempts cross-organization access to verify the isolation boundary is enforced.
 *
 * 1. Register and authenticate member A, create organization A
 * 2. Create employee record for member A in organization A
 * 3. Create a project in organization A
 * 4. Register and authenticate member B, create organization B
 * 5. Create employee record for member B in organization B
 * 6. Attempt to access organization A's project as member B
 * 7. Validate that access is denied with 404 Not Found
 */
export async function test_api_project_retrieve_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup member A and organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection);
  typia.assert(memberAAuthorized);
  const organizationA =
    await generate_random_hrm_time_track_member_organizations_create(
      memberAConnection,
      {
        body: {},
      },
    );
  typia.assert(organizationA);
  const employeeA =
    await generate_random_hrm_time_track_member_employees_create(
      memberAConnection,
      {
        body: {
          hrm_time_track_member_id: memberAAuthorized.id,
        },
      },
    );
  typia.assert(employeeA);
  const projectA =
    await generate_random_hrm_time_track_member_projects_create(
      memberAConnection,
      {
        body: {},
      },
    );
  typia.assert(projectA);
  // 2. Setup member B and organization B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection);
  typia.assert(memberBAuthorized);
  const organizationB =
    await generate_random_hrm_time_track_member_organizations_create(
      memberBConnection,
      {
        body: {},
      },
    );
  typia.assert(organizationB);
  const employeeB =
    await generate_random_hrm_time_track_member_employees_create(
      memberBConnection,
      {
        body: {
          hrm_time_track_member_id: memberBAuthorized.id,
        },
      },
    );
  typia.assert(employeeB);
  // 3. Attempt cross-organization access - member B tries to access project A
  await TestValidator.httpError(
    "cross-organization access denied",
    404,
    async () => {
      await api.functional.hrmTimeTrack.member.projects.at(memberBConnection, {
        projectId: projectA.id,
      });
    },
  );
}