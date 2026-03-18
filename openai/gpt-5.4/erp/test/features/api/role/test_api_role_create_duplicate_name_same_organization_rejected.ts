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

export async function test_api_role_create_duplicate_name_same_organization_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const roleName = `role-${RandomGenerator.alphaNumeric(8)}`;
  const permissionLiterals = [
    "employee:view",
    "project:view",
    "report:view",
  ] as const;
  const createBody = {
    name: roleName,
    permissions: [
      {
        permissions: [...permissionLiterals],
      },
    ],
  } satisfies IHrmTimeTrackingRole.ICreate;
  const created =
    await generate_random_hrm_time_tracking_owner_organizations_roles_create(
      ownerConnection,
      {
        params: {
          organizationId,
        },
        body: createBody,
      },
    );
  typia.assert(created);
  const snapshot = {
    id: created.id,
    name: created.name,
    built_in: created.built_in,
    organizationId: created.organization.id,
    permissionIds: created.permissions.map((p) => p.id),
    permissionCodes: created.permissions.map((p) => p.permission),
  };
  TestValidator.equals(
    "created role name matches request",
    created.name,
    createBody.name,
  );
  TestValidator.equals("created role is custom", created.built_in, false);
  TestValidator.equals(
    "created role organization matches path parameter",
    created.organization.id,
    organizationId,
  );
  TestValidator.equals(
    "permission assignment count matches requested codes",
    created.permissions.length,
    createBody.permissions[0].permissions.length,
  );
  TestValidator.predicate(
    "every permission belongs to created role",
    created.permissions.every(
      (permission) => permission.role.id === created.id,
    ),
  );
  TestValidator.predicate(
    "every permission role organization matches target organization",
    created.permissions.every(
      (permission) => permission.role.organization.id === organizationId,
    ),
  );
  TestValidator.predicate(
    "no created permission is soft deleted",
    created.permissions.every((permission) => permission.deleted_at === null),
  );
  await TestValidator.error(
    "duplicate role name in same organization is rejected",
    async () => {
      await generate_random_hrm_time_tracking_owner_organizations_roles_create(
        ownerConnection,
        {
          params: {
            organizationId,
          },
          body: createBody,
        },
      );
    },
  );
  TestValidator.equals(
    "original role id remains unchanged",
    created.id,
    snapshot.id,
  );
  TestValidator.equals(
    "original role name remains unchanged",
    created.name,
    snapshot.name,
  );
  TestValidator.equals(
    "original role built_in remains unchanged",
    created.built_in,
    snapshot.built_in,
  );
  TestValidator.equals(
    "original role organization remains unchanged",
    created.organization.id,
    snapshot.organizationId,
  );
  TestValidator.equals(
    "original permission ids remain unchanged",
    created.permissions.map((p) => p.id),
    snapshot.permissionIds,
  );
  TestValidator.equals(
    "original permission codes remain unchanged",
    created.permissions.map((p) => p.permission),
    snapshot.permissionCodes,
  );
}
