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

export async function test_api_role_permission_update_duplicate_assignment_conflict(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  const initialRole =
    await generate_random_hrm_time_tracking_owner_organizations_roles_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          name: `role-${RandomGenerator.alphabets(8)}`,
          permissions: [
            {
              permissions: ["employee:view"],
            },
          ],
        },
      },
    );
  typia.assert(initialRole);
  const roleWithPermissions =
    await generate_random_hrm_time_tracking_owner_organizations_roles_permissions_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
          roleId: initialRole.id,
        },
        body: {
          permissions: ["project:view"],
        },
      },
    );
  typia.assert(roleWithPermissions);
  const activePermissions = roleWithPermissions.permissions.filter(
    (permission) => permission.deleted_at === null,
  );
  TestValidator.equals(
    "two active permissions assigned",
    activePermissions.length,
    2,
  );
  const sourcePermission = typia.assert(activePermissions[0]!);
  const targetPermission = typia.assert(activePermissions[1]!);
  TestValidator.notEquals(
    "distinct permission codes prepared",
    sourcePermission.permission,
    targetPermission.permission,
  );
  const originalSourcePermissionCode = sourcePermission.permission;
  const originalTargetPermissionCode = targetPermission.permission;
  const updateBody = {
    permission: originalTargetPermissionCode,
  } satisfies IHrmTimeTrackingRolePermission.IUpdate;
  await TestValidator.httpError(
    "duplicate assignment update is rejected",
    [400, 409],
    async () => {
      await api.functional.hrmTimeTracking.owner.organizations.roles.permissions.update(
        ownerConnection,
        {
          organizationId: organization.id,
          roleId: initialRole.id,
          permissionId: sourcePermission.id,
          body: updateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "source permission snapshot remains original",
    sourcePermission.permission,
    originalSourcePermissionCode,
  );
  TestValidator.equals(
    "target permission snapshot remains original",
    targetPermission.permission,
    originalTargetPermissionCode,
  );
  TestValidator.notEquals(
    "source permission is still distinct from target permission in snapshot",
    sourcePermission.permission,
    targetPermission.permission,
  );
}
