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

export async function test_api_role_permission_update_custom_role_success(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: "https://example.com/owners/join",
      referrer: "https://example.com/owners",
      ip: "127.0.0.1",
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_uri: "https://example.com/logo.png",
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const initialPermission = "employee:view" as const;
  const siblingPermission = "project:view" as const;
  const replacementPermission = "time:manage" as const;
  const role =
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
              permissions: [initialPermission],
            },
          ],
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(role);
  TestValidator.equals(
    "role organization matches",
    role.organization.id,
    organization.id,
  );
  TestValidator.equals("role is custom", role.built_in, false);
  TestValidator.predicate(
    "role has initial permission",
    role.permissions.length > 0,
  );
  const targetPermission = typia.assert(
    role.permissions.find(
      (permission) => permission.permission === initialPermission,
    )!,
  );
  const roleWithSiblingPermission =
    await generate_random_hrm_time_tracking_owner_organizations_roles_permissions_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
          roleId: role.id,
        },
        body: {
          permissions: [siblingPermission],
        } satisfies IHrmTimeTrackingRolePermission.ICreate,
      },
    );
  typia.assert(roleWithSiblingPermission);
  const siblingAssignment = typia.assert(
    roleWithSiblingPermission.permissions.find(
      (permission) => permission.permission === siblingPermission,
    )!,
  );
  const updated =
    await api.functional.hrmTimeTracking.owner.organizations.roles.permissions.update(
      ownerConnection,
      {
        organizationId: organization.id,
        roleId: role.id,
        permissionId: targetPermission.id,
        body: {
          permission: replacementPermission,
        } satisfies IHrmTimeTrackingRolePermission.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated permission assignment id preserved",
    updated.id,
    targetPermission.id,
  );
  TestValidator.equals(
    "updated permission changed",
    updated.permission,
    replacementPermission,
  );
  TestValidator.equals("updated role id preserved", updated.role.id, role.id);
  TestValidator.equals(
    "updated organization context preserved",
    updated.role.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "updated role remains custom",
    updated.role.built_in,
    false,
  );
  TestValidator.equals(
    "created_at preserved",
    updated.created_at,
    targetPermission.created_at,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updated.updated_at,
    targetPermission.updated_at,
  );
  TestValidator.notEquals(
    "updated row differs from sibling assignment",
    updated.id,
    siblingAssignment.id,
  );
  TestValidator.notEquals(
    "updated permission differs from original target permission",
    updated.permission,
    targetPermission.permission,
  );
}
