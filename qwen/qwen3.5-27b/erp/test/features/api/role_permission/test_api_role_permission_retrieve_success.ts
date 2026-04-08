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
 * Test retrieving a specific permission assignment for a role within an organization.
 *
 * Validates the complete role permission retrieval flow including member authentication, organization creation, role setup with permissions, and permission retrieval. Ensures that the permission assignment correctly references the role and contains accurate metadata.
 *
 * Special attention is given to verifying that the permission code matches the one that was added, the role information in the response matches the created role, and the permission assignment includes proper timestamps.
 *
 * 1. Authenticate as a member to access organization and role management features.
 * 2. Create an organization context for role and permission setup.
 * 3. Create a custom role within the organization.
 * 4. Add a permission (employee_management) to the role.
 * 5. Retrieve the specific permission assignment using role ID and permission code.
 * 6. Validate the response contains correct permission details and role information.
 */
export async function test_api_role_permission_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role
  const role = await generate_random_hrm_time_track_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [],
      } satisfies IHrmTimeTrackRole.ICreate,
    },
  );
  typia.assert(role);
  // 4. Add a permission to the role
  const updatedRole =
    await api.functional.hrmTimeTrack.member.roles.permissions.addPermissions(
      memberConnection,
      {
        roleId: role.id,
        body: {
          permissions: ["employee_management"],
        } satisfies IHrmTimeTrackRole.IAddPermission,
      },
    );
  typia.assert(updatedRole);
  // 5. Retrieve the specific permission assignment
  const permission =
    await api.functional.hrmTimeTrack.member.roles.permissions.at(
      memberConnection,
      {
        roleId: role.id,
        permissionId: "employee_management",
      },
    );
  typia.assert(permission);
  // 6. Validate response
  TestValidator.equals(
    "permission code matches",
    permission.permission,
    "employee_management",
  );
  TestValidator.equals("role id matches", permission.role.id, role.id);
  TestValidator.equals("role name matches", permission.role.name, role.name);
  TestValidator.predicate(
    "has valid created_at timestamp",
    permission.created_at.length > 0,
  );
  TestValidator.predicate(
    "role is not builtin",
    permission.role.is_builtin === false,
  );
}
