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

export async function test_api_role_permissions_replace_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role with initial permissions
  const initialPermissions: string[] = ["employee:view", "project:view"];
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          permissions: initialPermissions,
          name: RandomGenerator.name(),
        },
      },
    );
  typia.assert(role);
  // Verify initial permissions
  const initialCodes = role.rolePermissions
    .map((p) => p.permission_code)
    .sort();
  TestValidator.equals(
    "initial permissions match",
    initialCodes,
    [...initialPermissions].sort(),
  );
  // 4. Replace permissions with a completely different set
  const newPermissions: string[] = [
    "time:manage",
    "time:view_all",
    "report:view",
  ];
  const updatedRole =
    await api.functional.hrmTimeTracking.member.organizations.roles.permissions.update(
      memberConnection,
      {
        organizationId: organization.id,
        roleId: role.id,
        body: {
          permissionCodes: newPermissions,
        } satisfies IHrmTimeTrackingRole.IUpdate,
      },
    );
  typia.assert(updatedRole);
  // 5. Verify the role type and new permissions
  TestValidator.equals("role type is custom", updatedRole.type, "custom");
  const actualPermissionCodes = updatedRole.rolePermissions
    .map((p) => p.permission_code)
    .sort();
  TestValidator.equals(
    "old permissions are removed and new permissions are assigned",
    actualPermissionCodes,
    [...newPermissions].sort(),
  );
}
