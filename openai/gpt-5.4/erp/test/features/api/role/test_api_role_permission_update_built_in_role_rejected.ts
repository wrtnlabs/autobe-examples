import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { generate_random_hrm_time_tracking_owner_organizations_roles_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_roles_create";
import { generate_random_hrm_time_tracking_owner_organizations_roles_permissions_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_roles_permissions_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";
import { prepare_random_hrm_time_tracking_role_permission } from "../../../prepare/prepare_random_hrm_time_tracking_role_permission";

export async function test_api_role_permission_update_built_in_role_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(authorized);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  const createdRole =
    await generate_random_hrm_time_tracking_owner_organizations_roles_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          name: `custom-role-${RandomGenerator.alphabets(8)}`,
          permissions: [
            {
              permissions: ["employee:view"],
            },
          ],
        },
      },
    );
  typia.assert(createdRole);
  TestValidator.equals("custom role is editable", createdRole.built_in, false);
  TestValidator.equals(
    "custom role organization matches created organization",
    createdRole.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "custom role has one permission assignment",
    createdRole.permissions.length,
    1,
  );
  const originalPermission = typia.assert(createdRole.permissions[0]!);
  const originalPermissionId = originalPermission.id;
  const originalPermissionCode = originalPermission.permission;
  const originalPermissionRoleId = originalPermission.role.id;
  const originalPermissionOrganizationId =
    originalPermission.role.organization.id;
  const originalRoleId = createdRole.id;
  const originalRoleBuiltIn = createdRole.built_in;
  const originalOrganizationId = createdRole.organization.id;
  const mismatchedRoleId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.notEquals(
    "mismatched role id differs from actual custom role id",
    mismatchedRoleId,
    createdRole.id,
  );
  const updateBody = {
    permission: "project:view",
  } satisfies IHrmTimeTrackingRolePermission.IUpdate;
  await TestValidator.error(
    "reject updating permission through mismatched or non-editable role path",
    async () => {
      await api.functional.hrmTimeTracking.owner.organizations.roles.permissions.update(
        ownerConnection,
        {
          organizationId: organization.id,
          roleId: mismatchedRoleId,
          permissionId: originalPermission.id,
          body: updateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "original permission id remains unchanged after rejection",
    originalPermissionId,
    originalPermission.id,
  );
  TestValidator.equals(
    "original permission code remains unchanged after rejection",
    originalPermissionCode,
    originalPermission.permission,
  );
  TestValidator.equals(
    "original permission role id remains unchanged after rejection",
    originalPermissionRoleId,
    originalPermission.role.id,
  );
  TestValidator.equals(
    "original permission organization remains unchanged after rejection",
    originalPermissionOrganizationId,
    originalPermission.role.organization.id,
  );
  TestValidator.equals(
    "custom role id remains unchanged after rejection",
    originalRoleId,
    createdRole.id,
  );
  TestValidator.equals(
    "custom role built_in flag remains unchanged after rejection",
    originalRoleBuiltIn,
    createdRole.built_in,
  );
  TestValidator.equals(
    "custom role organization relation remains unchanged after rejection",
    originalOrganizationId,
    createdRole.organization.id,
  );
}
