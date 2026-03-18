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

export async function test_api_role_permissions_cross_organization_scope_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(authorized);
  const firstOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `Org ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(firstOrganization);
  const initialPermissions = ["employee:view", "project:view"] as const;
  const firstRole =
    await generate_random_hrm_time_tracking_owner_organizations_roles_create(
      ownerConnection,
      {
        params: {
          organizationId: firstOrganization.id,
        },
        body: {
          name: `Role ${RandomGenerator.name()}`,
          permissions: [
            {
              permissions: [...initialPermissions],
            } satisfies IHrmTimeTrackingRolePermission.ICreate,
          ],
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(firstRole);
  const secondOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `Org ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 12,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(secondOrganization);
  const attemptedPermissions = [
    "org:manage",
    "employee:manage",
    "time:approve",
  ] as const;
  const updateBody = {
    permissions: [...attemptedPermissions],
  } satisfies IHrmTimeTrackingRole.IUpdatePermission;
  await TestValidator.error(
    "cross-organization role permission update is rejected",
    async () => {
      await api.functional.hrmTimeTracking.owner.organizations.roles.permissions.updatePermissions(
        ownerConnection,
        {
          organizationId: secondOrganization.id,
          roleId: firstRole.id,
          body: updateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "role remains owned by first organization",
    firstRole.organization.id,
    firstOrganization.id,
  );
  TestValidator.notEquals(
    "mismatched organization differs from role owner organization",
    secondOrganization.id,
    firstRole.organization.id,
  );
  TestValidator.equals(
    "created role permissions match initial assignment",
    firstRole.permissions.map((p) => p.permission).sort(),
    [...initialPermissions].sort(),
  );
  TestValidator.notEquals(
    "attempted replacement permissions were not the created permission set",
    firstRole.permissions.map((p) => p.permission).sort(),
    [...attemptedPermissions].sort(),
  );
}
