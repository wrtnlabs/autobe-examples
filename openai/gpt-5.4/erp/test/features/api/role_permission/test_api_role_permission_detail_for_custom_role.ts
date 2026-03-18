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

export async function test_api_role_permission_detail_for_custom_role(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingOwner.IAuthorized =
    await authorize_owner_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/owner/join",
        referrer: "https://example.com",
      },
    });
  typia.assert(authorized);
  const organization: IHrmTimeTrackingOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: "https://example.com/logo.png",
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  const initialPermission = "employee:view" as const;
  const addedPermission = "project:view" as const;
  const role: IHrmTimeTrackingRole =
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
              permissions: [initialPermission],
            },
          ],
        },
      },
    );
  typia.assert(role);
  const initialAssignment: IHrmTimeTrackingRolePermission = typia.assert(
    role.permissions.find(
      (permission) => permission.permission === initialPermission,
    )!,
  );
  const updatedRole: IHrmTimeTrackingRole =
    await generate_random_hrm_time_tracking_owner_organizations_roles_permissions_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
          roleId: role.id,
        },
        body: {
          permissions: [addedPermission],
        },
      },
    );
  typia.assert(updatedRole);
  const targetPermissionCandidate = updatedRole.permissions.find(
    (permission) => permission.permission === addedPermission,
  );
  TestValidator.predicate(
    "added permission assignment exists on updated role",
    targetPermissionCandidate !== undefined,
  );
  const targetPermission: IHrmTimeTrackingRolePermission = typia.assert(
    targetPermissionCandidate!,
  );
  const detail: IHrmTimeTrackingRolePermission =
    await api.functional.hrmTimeTracking.owner.organizations.roles.permissions.at(
      ownerConnection,
      {
        organizationId: organization.id,
        roleId: role.id,
        permissionId: targetPermission.id,
      },
    );
  typia.assert(detail);
  TestValidator.notEquals(
    "added permission assignment differs from initial assignment",
    targetPermission.id,
    initialAssignment.id,
  );
  TestValidator.equals(
    "permission assignment id matches requested id",
    detail.id,
    targetPermission.id,
  );
  TestValidator.equals(
    "permission code matches granted permission",
    detail.permission,
    targetPermission.permission,
  );
  TestValidator.equals(
    "detail role id matches",
    detail.role.id,
    updatedRole.id,
  );
  TestValidator.equals(
    "detail role name matches",
    detail.role.name,
    updatedRole.name,
  );
  TestValidator.equals(
    "detail role built_in matches",
    detail.role.built_in,
    updatedRole.built_in,
  );
  TestValidator.equals(
    "detail role created_at matches",
    detail.role.created_at,
    updatedRole.created_at,
  );
  TestValidator.equals(
    "detail role updated_at matches",
    detail.role.updated_at,
    updatedRole.updated_at,
  );
  TestValidator.equals(
    "detail role deleted_at matches",
    detail.role.deleted_at,
    updatedRole.deleted_at,
  );
  TestValidator.equals(
    "detail organization id matches",
    detail.role.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "detail organization name matches",
    detail.role.organization.name,
    organization.name,
  );
  TestValidator.equals(
    "detail organization description matches",
    detail.role.organization.description,
    organization.description,
  );
  TestValidator.equals(
    "detail organization logo_uri matches",
    detail.role.organization.logo_uri,
    organization.logo_uri,
  );
  TestValidator.equals(
    "detail organization currency_code matches",
    detail.role.organization.currency_code,
    organization.currency_code,
  );
  TestValidator.equals(
    "detail organization timezone matches",
    detail.role.organization.timezone,
    organization.timezone,
  );
  TestValidator.equals(
    "detail organization fiscal_start_month matches",
    detail.role.organization.fiscal_start_month,
    organization.fiscal_start_month,
  );
  TestValidator.equals(
    "detail organization created_at matches",
    detail.role.organization.created_at,
    updatedRole.organization.created_at,
  );
  TestValidator.equals(
    "detail organization updated_at matches",
    detail.role.organization.updated_at,
    updatedRole.organization.updated_at,
  );
  TestValidator.equals(
    "permission assignment is active",
    detail.deleted_at,
    null,
  );
  TestValidator.predicate(
    "permission created_at is present",
    detail.created_at.length > 0,
  );
  TestValidator.predicate(
    "permission updated_at is present",
    detail.updated_at.length > 0,
  );
  TestValidator.equals(
    "role summary does not expose permissions collection",
    Object.prototype.hasOwnProperty.call(detail.role, "permissions"),
    false,
  );
}
