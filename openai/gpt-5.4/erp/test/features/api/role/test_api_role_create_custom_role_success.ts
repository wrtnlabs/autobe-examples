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
import { generate_random_hrm_time_tracking_owner_organizations_roles_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_roles_create";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";
import { prepare_random_hrm_time_tracking_role_permission } from "../../../prepare/prepare_random_hrm_time_tracking_role_permission";

export async function test_api_role_create_custom_role_success(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const requestedPermissions = [
    "org:manage",
    "employee:view",
    "report:view",
  ] as const;
  const body = {
    name: `custom-role-${RandomGenerator.alphaNumeric(8)}`,
    permissions: [
      { permissions: [requestedPermissions[0]] },
      { permissions: [requestedPermissions[1], requestedPermissions[2]] },
    ],
  } satisfies IHrmTimeTrackingRole.ICreate;
  const role =
    await generate_random_hrm_time_tracking_owner_organizations_roles_create(
      ownerConnection,
      {
        params: {
          organizationId,
        },
        body,
      },
    );
  typia.assert(role);
  const submittedCodes: string[] = body.permissions.flatMap(
    (permission) => permission.permissions,
  );
  const returnedCodes: string[] = role.permissions.map(
    (permission) => permission.permission,
  );
  TestValidator.notEquals(
    "new role id differs from organization id",
    role.id,
    organizationId,
  );
  TestValidator.equals("role name matches request", role.name, body.name);
  TestValidator.equals("role is custom", role.built_in, false);
  TestValidator.equals(
    "role organization matches target",
    role.organization.id,
    organizationId,
  );
  TestValidator.equals(
    "returned permission count matches submitted codes",
    role.permissions.length,
    submittedCodes.length,
  );
  for (const permission of role.permissions) {
    TestValidator.equals(
      "permission role id matches created role",
      permission.role.id,
      role.id,
    );
    TestValidator.equals(
      "permission role organization matches target",
      permission.role.organization.id,
      organizationId,
    );
    TestValidator.equals(
      "permission role name matches created role name",
      permission.role.name,
      role.name,
    );
    TestValidator.equals(
      "permission role built_in matches custom role",
      permission.role.built_in,
      false,
    );
    TestValidator.predicate(
      "returned permission belongs to submitted catalog",
      submittedCodes.includes(permission.permission),
    );
  }
  for (const submitted of submittedCodes) {
    TestValidator.predicate(
      `submitted permission ${submitted} is persisted`,
      returnedCodes.includes(submitted),
    );
  }
}
