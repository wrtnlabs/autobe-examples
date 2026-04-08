import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { generate_random_hrm_time_track_member_roles_create } from "../../../generate/generate_random_hrm_time_track_member_roles_create";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_role } from "../../../prepare/prepare_random_hrm_time_track_role";

/**
 * Test retrieving a permission assignment that does not exist for a given role.
 *
 * Validates that attempting to retrieve a permission assignment for a role-permission combination that was never created returns a proper 404 Not Found error. The test creates a role with only one specific permission, then attempts to retrieve a different permission that was not assigned to the role.
 *
 * This ensures the system correctly validates permission assignments and returns appropriate error responses when a requested permission does not exist for a specific role.
 *
 * 1. Authenticate as a member with appropriate permissions.
 * 2. Create an organization context for role and permission setup.
 * 3. Create a custom role with only one permission (employee_management).
 * 4. Attempt to retrieve a different permission (project_management) that was not added to the role.
 * 5. Verify the API returns HTTP 404 Not Found error.
 */
export async function test_api_role_permission_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create role with only one specific permission
  const role = await generate_random_hrm_time_track_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: ["employee_management"],
      } satisfies IHrmTimeTrackRole.ICreate,
    },
  );
  typia.assert(role);
  // 4. Attempt to retrieve a permission that was NOT added to the role
  await TestValidator.httpError(
    "should return 404 for non-existent permission assignment",
    404,
    async () =>
      await api.functional.hrmTimeTrack.member.roles.permissions.at(
        memberConnection,
        {
          roleId: role.id,
          permissionId: "project_management",
        },
      ),
  );
}
