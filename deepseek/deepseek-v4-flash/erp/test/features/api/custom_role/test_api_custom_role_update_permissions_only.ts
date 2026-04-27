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
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";

export async function test_api_custom_role_update_permissions_only(
  connection: api.IConnection,
): Promise<void> {
  // Setup member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Create organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Create a custom role with name 'Reviewer' and permissions ['time:view_all', 'report:view']
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          name: "Reviewer",
          permissions: ["time:view_all", "report:view"],
        },
      },
    );
  typia.assert(role);
  TestValidator.equals("initial role name", role.name, "Reviewer");
  TestValidator.equals("initial role type", role.type, "custom");
  const initialPermissionCodes = role.rolePermissions.map(
    (rp) => rp.permission_code,
  );
  TestValidator.predicate(
    "initial has time:view_all",
    initialPermissionCodes.includes("time:view_all"),
  );
  TestValidator.predicate(
    "initial has report:view",
    initialPermissionCodes.includes("report:view"),
  );
  // Update role: only change permissions, omit name
  const updatedRole =
    await api.functional.hrmTimeTracking.member.organizations.roles.update(
      memberConnection,
      {
        organizationId: organization.id,
        roleId: role.id,
        body: {
          permissionCodes: ["employee:view", "project:view"],
        } satisfies IHrmTimeTrackingRole.IUpdate,
      },
    );
  typia.assert(updatedRole);
  // Validate name unchanged, type unchanged
  TestValidator.equals(
    "name unchanged after update",
    updatedRole.name,
    "Reviewer",
  );
  TestValidator.equals("type is custom", updatedRole.type, "custom");
  // Validate permissions were replaced
  const updatedPermissionCodes = updatedRole.rolePermissions.map(
    (rp) => rp.permission_code,
  );
  TestValidator.equals(
    "new permissions count",
    updatedPermissionCodes.length,
    2,
  );
  TestValidator.predicate(
    "has employee:view",
    updatedPermissionCodes.includes("employee:view"),
  );
  TestValidator.predicate(
    "has project:view",
    updatedPermissionCodes.includes("project:view"),
  );
  TestValidator.predicate(
    "old time:view_all removed",
    updatedPermissionCodes.includes("time:view_all") === false,
  );
  TestValidator.predicate(
    "old report:view removed",
    updatedPermissionCodes.includes("report:view") === false,
  );
  const firstUpdatedAt = updatedRole.updated_at;
  // Test with empty permissionCodes array to verify clearing all permissions
  const clearedRole =
    await api.functional.hrmTimeTracking.member.organizations.roles.update(
      memberConnection,
      {
        organizationId: organization.id,
        roleId: role.id,
        body: {
          permissionCodes: [],
        } satisfies IHrmTimeTrackingRole.IUpdate,
      },
    );
  typia.assert(clearedRole);
  // Validate permissions cleared, name still unchanged, updated_at refreshed
  TestValidator.equals(
    "name still unchanged after clear",
    clearedRole.name,
    "Reviewer",
  );
  TestValidator.equals(
    "all permissions cleared",
    clearedRole.rolePermissions.length,
    0,
  );
  TestValidator.predicate(
    "updated_at refreshed",
    clearedRole.updated_at !== firstUpdatedAt,
  );
}
