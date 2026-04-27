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

export async function test_api_custom_role_update_name_and_permissions(
  connection: api.IConnection,
): Promise<void> {
  // Setup: register member and create organization
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Create a custom role with initial name and permissions
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberConnection,
      {
        body: {
          name: "Developer",
          permissions: ["project:view", "time:manage"],
        } satisfies IHrmTimeTrackingRole.ICreate,
        params: { organizationId: organization.id },
      },
    );
  typia.assert(role);
  TestValidator.equals("initial role name", role.name, "Developer");
  TestValidator.equals("role type is custom", role.type, "custom");
  const initialPermissionCodes = role.rolePermissions
    .map((rp) => rp.permission_code)
    .sort();
  TestValidator.equals("initial permissions set", initialPermissionCodes, [
    "project:view",
    "time:manage",
  ]);
  // Update the role's name and replace its permission set
  const updatedRole =
    await api.functional.hrmTimeTracking.member.organizations.roles.update(
      memberConnection,
      {
        organizationId: organization.id,
        roleId: role.id,
        body: {
          name: "Senior Developer",
          permissionCodes: [
            "project:manage",
            "project:view",
            "time:manage",
            "time:view_all",
          ],
        } satisfies IHrmTimeTrackingRole.IUpdate,
      },
    );
  typia.assert(updatedRole);
  // Validate the updated role
  TestValidator.equals("role id unchanged", updatedRole.id, role.id);
  TestValidator.equals(
    "role name updated",
    updatedRole.name,
    "Senior Developer",
  );
  TestValidator.equals("role type unchanged", updatedRole.type, "custom");
  TestValidator.equals(
    "permission count",
    updatedRole.rolePermissions.length,
    4,
  );
  const actualPermissionCodes = updatedRole.rolePermissions
    .map((rp) => rp.permission_code)
    .sort();
  TestValidator.equals(
    "permissions completely replaced",
    actualPermissionCodes,
    ["project:manage", "project:view", "time:manage", "time:view_all"],
  );
  TestValidator.predicate(
    "updated_at moved forward after update",
    () =>
      new Date(updatedRole.updated_at).getTime() >
      new Date(role.updated_at).getTime(),
  );
}
