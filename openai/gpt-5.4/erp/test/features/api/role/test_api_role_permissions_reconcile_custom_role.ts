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
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";
import { prepare_random_hrm_time_tracking_role_permission } from "../../../prepare/prepare_random_hrm_time_tracking_role_permission";

export async function test_api_role_permissions_reconcile_custom_role(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!" as string & tags.Format<"password">,
      href: "https://example.com/owners/join" as string & tags.Format<"uri">,
      referrer: "https://example.com/owners" as string & tags.Format<"uri">,
      ip: "127.0.0.1" as string & tags.Format<"ipv4">,
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(owner);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: "https://example.com/logo.png" as string &
            tags.Format<"uri">,
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const initialPermissions = ["project:manage", "project:view"] as const;
  const initialPermissionList: string[] = [...initialPermissions];
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
              permissions: [...initialPermissions],
            } satisfies IHrmTimeTrackingRolePermission.ICreate,
          ],
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(createdRole);
  const reconciledPermissions = [
    "employee:view",
    "project:view",
    "time:approve",
    "report:view",
  ] as const;
  const reconciledPermissionList: string[] = [...reconciledPermissions];
  const updateBody = {
    permissions: [...reconciledPermissions],
  } satisfies IHrmTimeTrackingRole.IUpdatePermission;
  const updatedRole =
    await api.functional.hrmTimeTracking.owner.organizations.roles.permissions.updatePermissions(
      ownerConnection,
      {
        organizationId: organization.id,
        roleId: createdRole.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRole);
  TestValidator.equals("role id is preserved", updatedRole.id, createdRole.id);
  TestValidator.equals(
    "organization id is preserved",
    updatedRole.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "custom role remains custom",
    updatedRole.built_in,
    false,
  );
  TestValidator.equals(
    "role name is preserved",
    updatedRole.name,
    createdRole.name,
  );
  const responsePermissions = updatedRole.permissions.map((p) => p.permission);
  const uniqueResponsePermissions = new Set(responsePermissions);
  const sortedResponsePermissions = [...uniqueResponsePermissions].sort();
  const sortedRequestedPermissions = [...reconciledPermissionList].sort();
  TestValidator.equals(
    "reconciled permissions exactly match request",
    sortedResponsePermissions,
    sortedRequestedPermissions,
  );
  TestValidator.equals(
    "response contains no duplicate permissions",
    uniqueResponsePermissions.size,
    responsePermissions.length,
  );
  for (const permission of reconciledPermissionList)
    TestValidator.predicate(
      `requested permission is present: ${permission}`,
      responsePermissions.includes(permission),
    );
  for (const permission of initialPermissionList)
    if (reconciledPermissionList.includes(permission) === false)
      TestValidator.predicate(
        `obsolete permission is removed: ${permission}`,
        responsePermissions.includes(permission) === false,
      );
  for (const permission of updatedRole.permissions) {
    TestValidator.equals(
      "permission belongs to updated role",
      permission.role.id,
      updatedRole.id,
    );
    TestValidator.equals(
      "permission belongs to same organization",
      permission.role.organization.id,
      organization.id,
    );
    TestValidator.equals(
      "nested role remains custom",
      permission.role.built_in,
      false,
    );
  }
}
