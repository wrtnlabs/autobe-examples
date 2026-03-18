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

export async function test_api_role_detail_custom_role_in_organization(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  const selectedPermissions = [
    "employee:view",
    "project:view",
    "report:view",
  ] satisfies IHrmTimeTrackingRolePermission.ICreate["permissions"];
  const normalizedPermissionCodes = Array.from(
    new Set(selectedPermissions),
  ).sort();
  const roleName = `custom-role-${RandomGenerator.alphabets(8)}`;
  const createdRole =
    await generate_random_hrm_time_tracking_owner_organizations_roles_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          name: roleName,
          permissions: [
            {
              permissions: selectedPermissions,
            },
          ],
        },
      },
    );
  typia.assert(createdRole);
  const detail =
    await api.functional.hrmTimeTracking.owner.organizations.roles.at(
      ownerConnection,
      {
        organizationId: organization.id,
        roleId: createdRole.id,
      },
    );
  typia.assert(detail);
  const actualPermissionCodes = detail.permissions
    .map((permission) => permission.permission)
    .sort();
  TestValidator.equals("role id matches", detail.id, createdRole.id);
  TestValidator.equals("role name matches", detail.name, roleName);
  TestValidator.equals("custom role is not built-in", detail.built_in, false);
  TestValidator.equals(
    "organization summary matches persisted role organization",
    detail.organization,
    createdRole.organization,
  );
  TestValidator.equals(
    "permission codes match normalized selected set",
    actualPermissionCodes,
    normalizedPermissionCodes,
  );
  TestValidator.equals(
    "role created_at unchanged after read",
    detail.created_at,
    createdRole.created_at,
  );
  TestValidator.equals(
    "role updated_at unchanged after read",
    detail.updated_at,
    createdRole.updated_at,
  );
  TestValidator.equals(
    "role deleted_at unchanged after read",
    detail.deleted_at,
    createdRole.deleted_at,
  );
  TestValidator.equals(
    "permission count matches normalized selection",
    detail.permissions.length,
    normalizedPermissionCodes.length,
  );
  for (const permission of detail.permissions) {
    TestValidator.equals(
      "permission belongs to retrieved role",
      permission.role.id,
      detail.id,
    );
    TestValidator.equals(
      "permission role organization summary matches detail",
      permission.role.organization,
      detail.organization,
    );
    TestValidator.equals(
      "permission role name matches detail",
      permission.role.name,
      detail.name,
    );
    TestValidator.equals(
      "permission role built_in matches detail",
      permission.role.built_in,
      detail.built_in,
    );
  }
}
