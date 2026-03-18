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

export async function test_api_role_update_custom_role_permissions_replaced(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  const fiscalStartMonth = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
  >();
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
          fiscal_start_month: fiscalStartMonth,
        },
      },
    );
  typia.assert(organization);
  const initialPermissions = ["employee:view", "project:view"] as const;
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
            },
          ],
        },
      },
    );
  typia.assert(createdRole);
  TestValidator.equals(
    "created role belongs to organization",
    createdRole.organization.id,
    organization.id,
  );
  TestValidator.equals("created role is custom", createdRole.built_in, false);
  const replacementPermissions = [
    "employee:manage",
    "time:approve",
    "report:view",
  ] as const;
  const updatedName = `updated-role-${RandomGenerator.alphabets(8)}`;
  const updatedRole =
    await api.functional.hrmTimeTracking.owner.organizations.roles.update(
      ownerConnection,
      {
        organizationId: organization.id,
        roleId: createdRole.id,
        body: {
          name: updatedName,
          permissions: [
            {
              permissions: [...replacementPermissions],
            },
          ],
        } satisfies IHrmTimeTrackingRole.IUpdate,
      },
    );
  typia.assert(updatedRole);
  TestValidator.equals(
    "role identity is preserved",
    updatedRole.id,
    createdRole.id,
  );
  TestValidator.equals(
    "organization scope is preserved",
    updatedRole.organization.id,
    organization.id,
  );
  TestValidator.equals("role remains custom", updatedRole.built_in, false);
  TestValidator.equals("role name is updated", updatedRole.name, updatedName);
  const actualPermissions = updatedRole.permissions
    .map((permission) => permission.permission)
    .slice()
    .sort();
  const expectedPermissions = [...replacementPermissions].slice().sort();
  const originalPermissions = [...initialPermissions].slice().sort();
  TestValidator.equals(
    "replacement permission set is applied",
    actualPermissions,
    expectedPermissions,
  );
  TestValidator.notEquals(
    "permission set is no longer the original set",
    actualPermissions,
    originalPermissions,
  );
  TestValidator.equals(
    "effective permission count matches replacement set",
    updatedRole.permissions.length,
    replacementPermissions.length,
  );
  for (const permission of updatedRole.permissions) {
    TestValidator.equals(
      "permission belongs to updated role",
      permission.role.id,
      updatedRole.id,
    );
    TestValidator.equals(
      "permission remains in same organization",
      permission.role.organization.id,
      organization.id,
    );
  }
}
