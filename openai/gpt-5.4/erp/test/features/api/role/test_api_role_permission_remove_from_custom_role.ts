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

export async function test_api_role_permission_remove_from_custom_role(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
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
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const initialPermissions = ["employee:view", "project:view"] as const;
  const role =
    await generate_random_hrm_time_tracking_owner_organizations_roles_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          name: `role-${RandomGenerator.alphabets(8)}`,
          permissions: initialPermissions.map(
            (permission) =>
              ({
                permissions: [permission],
              }) satisfies IHrmTimeTrackingRolePermission.ICreate,
          ),
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(role);
  TestValidator.equals(
    "role belongs to created organization",
    role.organization.id,
    organization.id,
  );
  TestValidator.equals("custom role is not built-in", role.built_in, false);
  TestValidator.equals(
    "initial role contains expected permission count",
    role.permissions.length,
    initialPermissions.length,
  );
  const removablePermissionCode = "report:view" as const;
  const roleAfterAddition =
    await generate_random_hrm_time_tracking_owner_organizations_roles_permissions_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
          roleId: role.id,
        },
        body: {
          permissions: [removablePermissionCode],
        } satisfies IHrmTimeTrackingRolePermission.ICreate,
      },
    );
  typia.assert(roleAfterAddition);
  TestValidator.equals(
    "role remains in same organization after permission add",
    roleAfterAddition.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "role identity remains same after permission add",
    roleAfterAddition.id,
    role.id,
  );
  TestValidator.predicate(
    "role has multiple permission assignments before deletion",
    roleAfterAddition.permissions.length > 1,
  );
  TestValidator.predicate(
    "initial permissions remain present before deletion",
    initialPermissions.every((permissionCode) =>
      roleAfterAddition.permissions.some(
        (permission) => permission.permission === permissionCode,
      ),
    ),
  );
  const removablePermissions = roleAfterAddition.permissions.filter(
    (permission) => permission.permission === removablePermissionCode,
  );
  TestValidator.equals(
    "exactly one removable permission assignment exists",
    removablePermissions.length,
    1,
  );
  const removablePermission = removablePermissions[0]!;
  TestValidator.equals(
    "removable permission belongs to same role",
    removablePermission.role.id,
    role.id,
  );
  TestValidator.equals(
    "removable permission belongs to same organization",
    removablePermission.role.organization.id,
    organization.id,
  );
  await api.functional.hrmTimeTracking.owner.organizations.roles.permissions.erase(
    ownerConnection,
    {
      organizationId: organization.id,
      roleId: role.id,
      permissionId: removablePermission.id,
    },
  );
}
