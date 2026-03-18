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

export async function test_api_role_permission_rejects_permission_from_another_role(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "OwnerPass1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
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
  const roleA =
    await generate_random_hrm_time_tracking_owner_organizations_roles_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          name: `role-a-${RandomGenerator.alphabets(8)}`,
          permissions: [
            {
              permissions: ["employee:view"],
            } satisfies IHrmTimeTrackingRolePermission.ICreate,
          ],
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(roleA);
  const roleAWithSecondPermission =
    await generate_random_hrm_time_tracking_owner_organizations_roles_permissions_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
          roleId: roleA.id,
        },
        body: {
          permissions: ["project:view"],
        } satisfies IHrmTimeTrackingRolePermission.ICreate,
      },
    );
  typia.assert(roleAWithSecondPermission);
  TestValidator.equals(
    "role A has two permissions before rejected delete",
    roleAWithSecondPermission.permissions.length,
    2,
  );
  const roleB =
    await generate_random_hrm_time_tracking_owner_organizations_roles_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          name: `role-b-${RandomGenerator.alphabets(8)}`,
          permissions: [
            {
              permissions: ["time:view_all"],
            } satisfies IHrmTimeTrackingRolePermission.ICreate,
          ],
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(roleB);
  const roleBWithSecondPermission =
    await generate_random_hrm_time_tracking_owner_organizations_roles_permissions_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
          roleId: roleB.id,
        },
        body: {
          permissions: ["report:view"],
        } satisfies IHrmTimeTrackingRolePermission.ICreate,
      },
    );
  typia.assert(roleBWithSecondPermission);
  TestValidator.equals(
    "role B has two permissions before rejected delete",
    roleBWithSecondPermission.permissions.length,
    2,
  );
  const foreignPermission = roleBWithSecondPermission.permissions.find(
    (permission) => permission.permission === "report:view",
  );
  const safeForeignPermission = typia.assert(foreignPermission!);
  const roleAPermissionIdsBefore = roleAWithSecondPermission.permissions.map(
    (permission) => permission.id,
  );
  const roleBPermissionIdsBefore = roleBWithSecondPermission.permissions.map(
    (permission) => permission.id,
  );
  await TestValidator.error(
    "rejects deleting permission from another role",
    async () => {
      await api.functional.hrmTimeTracking.owner.organizations.roles.permissions.erase(
        ownerConnection,
        {
          organizationId: organization.id,
          roleId: roleA.id,
          permissionId: safeForeignPermission.id,
        },
      );
    },
  );
  const roleBAfterRejectedDelete =
    await generate_random_hrm_time_tracking_owner_organizations_roles_permissions_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
          roleId: roleB.id,
        },
        body: {
          permissions: ["project:manage"],
        } satisfies IHrmTimeTrackingRolePermission.ICreate,
      },
    );
  typia.assert(roleBAfterRejectedDelete);
  TestValidator.equals(
    "role B permission count increases only by valid follow-up add",
    roleBAfterRejectedDelete.permissions.length,
    3,
  );
  TestValidator.predicate(
    "foreign permission still exists on role B",
    roleBAfterRejectedDelete.permissions.some(
      (permission) => permission.id === safeForeignPermission.id,
    ),
  );
  TestValidator.predicate(
    "role B preserved all prior permission assignments after rejected delete",
    roleBPermissionIdsBefore.every((id) =>
      roleBAfterRejectedDelete.permissions.some(
        (permission) => permission.id === id,
      ),
    ),
  );
  TestValidator.predicate(
    "role B gained the new valid permission afterward",
    roleBAfterRejectedDelete.permissions.some(
      (permission) => permission.permission === "project:manage",
    ),
  );
  const roleAAfterRejectedDelete =
    await generate_random_hrm_time_tracking_owner_organizations_roles_permissions_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
          roleId: roleA.id,
        },
        body: {
          permissions: ["employee:manage"],
        } satisfies IHrmTimeTrackingRolePermission.ICreate,
      },
    );
  typia.assert(roleAAfterRejectedDelete);
  TestValidator.equals(
    "role A permission count increases only by valid follow-up add",
    roleAAfterRejectedDelete.permissions.length,
    3,
  );
  TestValidator.predicate(
    "role A preserved all prior permission assignments after rejected delete",
    roleAPermissionIdsBefore.every((id) =>
      roleAAfterRejectedDelete.permissions.some(
        (permission) => permission.id === id,
      ),
    ),
  );
  TestValidator.predicate(
    "role A gained the new valid permission afterward",
    roleAAfterRejectedDelete.permissions.some(
      (permission) => permission.permission === "employee:manage",
    ),
  );
}
