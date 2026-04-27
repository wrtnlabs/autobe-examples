import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_organizations_roles_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_roles_create";
import { generate_random_hrm_time_tracking_member_organizations_roles_permissions_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_roles_permissions_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";
import { prepare_random_hrm_time_tracking_role_permission } from "../../../prepare/prepare_random_hrm_time_tracking_role_permission";

/**
 * Test that an organization owner can retrieve a specific permission mapping assigned to a custom role.
 *
 * Validates the complete permission retrieval workflow including member registration, organization creation, custom role creation with specific permissions, permission assignment, and subsequent retrieval of the permission mapping by its primary key.
 *
 * Special attention is given to verifying that the returned permission record correctly references its parent role and organization, and that the permission code, role name, and role type are accurately reflected in the response.
 *
 * 1. Register a new member via the join endpoint (becomes the organization owner)
 * 2. Create a new organization (member becomes the Owner)
 * 3. Create a custom role named 'Project Lead' with permissions ['project:manage', 'project:view']
 * 4. Assign 'project:manage' permission code to the custom role
 * 5. Retrieve the permission mapping by its ID
 * 6. Validate permission_code, role.id, role.name, role.type, and deleted_at
 */
export async function test_api_role_permission_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization (member becomes Owner)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role named 'Project Lead' with specific permissions
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberConnection,
      {
        body: {
          name: "Project Lead",
          permissions: ["project:manage", "project:view"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(role);
  TestValidator.equals("role name", role.name, "Project Lead");
  TestValidator.equals("role type", role.type, "custom");
  // 4. Assign 'project:manage' permission to the role
  const permission =
    await generate_random_hrm_time_tracking_member_organizations_roles_permissions_create(
      memberConnection,
      {
        body: {
          permission_code: "project:manage",
        },
        params: {
          organizationId: organization.id,
          roleId: role.id,
        },
      },
    );
  typia.assert(permission);
  TestValidator.equals(
    "assigned permission code",
    permission.permission_code,
    "project:manage",
  );
  // 5. Retrieve the permission mapping by ID
  const retrieved =
    await api.functional.hrmTimeTracking.member.organizations.roles.permissions.at(
      memberConnection,
      {
        organizationId: organization.id,
        roleId: role.id,
        permissionId: permission.id,
      },
    );
  typia.assert(retrieved);
  // 6. Validate retrieved permission mapping
  TestValidator.equals(
    "permission code",
    retrieved.permission_code,
    "project:manage",
  );
  TestValidator.equals("role.id", retrieved.role.id, role.id);
  TestValidator.equals(
    "role.organization.id",
    retrieved.role.organization.id,
    organization.id,
  );
  TestValidator.equals("role.name", retrieved.role.name, "Project Lead");
  TestValidator.equals("role.type", retrieved.role.type, "custom");
  TestValidator.predicate("deleted_at is null", retrieved.deleted_at === null);
}
