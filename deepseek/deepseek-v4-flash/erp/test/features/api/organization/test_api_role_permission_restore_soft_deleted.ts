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
 * Test duplicate permission assignment rejection when the same permission code is already actively assigned to a role.
 *
 * Validates that the create-permission endpoint correctly detects existing active (non-deleted) permission assignments and rejects duplicate assignments with 409 Conflict. This covers the business rule where each (role, permission_code) pair must have at most one active assignment at any time.
 *
 * The full restore-on-soft-delete scenario (create → soft-delete → re-create with same code expecting 200 OK and restored record) would require the DELETE endpoint which is not available in the current SDK. This test validates the active-duplicate rejection path instead.
 *
 * 1. Member joins the platform and creates an organization (becoming the Owner with org:manage permission).
 * 2. A custom role is created within the organization with an initial set of permissions that excludes &#x27;project:view&#x27;.
 * 3. The &#x27;project:view&#x27; permission is assigned to the role via the target endpoint — expected to succeed with 201 Created.
 * 4. The same permission code is assigned again — expected to be rejected with 409 Conflict since the assignment is already active.
 */
export async function test_api_role_permission_restore_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // ---- 1. Member setup ----
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // ---- 2. Organization creation ----
  const org =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(org);
  // ---- 3. Custom role creation (without &#x27;project:view&#x27; permission) ----
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberConnection,
      {
        body: {
          permissions: ["employee:view"],
        },
        params: { organizationId: org.id },
      },
    );
  typia.assert(role);
  // ---- 4. Assign &#x27;project:view&#x27; permission to the role ----
  const permissionCode = "project:view";
  const permission =
    await api.functional.hrmTimeTracking.member.organizations.roles.permissions.create(
      memberConnection,
      {
        organizationId: org.id,
        roleId: role.id,
        body: {
          permission_code: permissionCode,
        } satisfies IHrmTimeTrackingRolePermission.ICreate,
      },
    );
  typia.assert(permission);
  // Verify the permission assignment is active
  TestValidator.equals(
    "permission code matches input",
    permission.permission_code,
    permissionCode,
  );
  TestValidator.predicate(
    "permission is active (not soft-deleted)",
    permission.deleted_at === null,
  );
  // ---- 5. Attempt to assign the same permission again → expect 409 Conflict ----
  await TestValidator.httpError(
    "duplicate permission rejected",
    409,
    async () => {
      await api.functional.hrmTimeTracking.member.organizations.roles.permissions.create(
        memberConnection,
        {
          organizationId: org.id,
          roleId: role.id,
          body: {
            permission_code: permissionCode,
          } satisfies IHrmTimeTrackingRolePermission.ICreate,
        },
      );
    },
  );
}
