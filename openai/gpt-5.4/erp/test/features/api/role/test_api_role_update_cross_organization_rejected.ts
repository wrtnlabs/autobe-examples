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

export async function test_api_role_update_cross_organization_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  const organizationOne =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-one-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >() satisfies number as number,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organizationOne);
  const organizationTwo =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-two-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "USD",
          timezone: "UTC",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >() satisfies number as number,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organizationTwo);
  TestValidator.notEquals(
    "organizations must be different tenants",
    organizationOne.id,
    organizationTwo.id,
  );
  const createdRole =
    await generate_random_hrm_time_tracking_owner_organizations_roles_create(
      ownerConnection,
      {
        params: {
          organizationId: organizationTwo.id,
        },
        body: {
          name: `cross-tenant-role-${RandomGenerator.alphabets(8)}`,
          permissions: [
            {
              permissions: ["employee:view", "project:view"],
            },
          ],
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(createdRole);
  TestValidator.equals(
    "created role belongs to organization two",
    createdRole.organization.id,
    organizationTwo.id,
  );
  TestValidator.notEquals(
    "created role must not belong to organization one",
    createdRole.organization.id,
    organizationOne.id,
  );
  TestValidator.predicate(
    "created role is custom",
    createdRole.built_in === false,
  );
  const originalRoleId = createdRole.id;
  const originalRoleName = createdRole.name;
  const originalOrganizationId = createdRole.organization.id;
  const originalPermissionCodes = createdRole.permissions.map(
    (permission) => permission.permission,
  );
  const originalUpdatedAt = createdRole.updated_at;
  const originalBuiltIn = createdRole.built_in;
  const updateBody = {
    name: `illegal-update-${RandomGenerator.alphabets(8)}`,
    permissions: [
      {
        permissions: ["time:approve", "report:view"],
      },
    ],
  } satisfies IHrmTimeTrackingRole.IUpdate;
  await TestValidator.httpError(
    "cross-organization role update must be rejected",
    [400, 403, 404, 422],
    async () => {
      await api.functional.hrmTimeTracking.owner.organizations.roles.update(
        ownerConnection,
        {
          organizationId: organizationOne.id,
          roleId: createdRole.id,
          body: updateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "role id remains unchanged after rejected cross-organization update",
    createdRole.id,
    originalRoleId,
  );
  TestValidator.equals(
    "role organization remains organization two",
    createdRole.organization.id,
    originalOrganizationId,
  );
  TestValidator.equals(
    "role name remains original after rejection",
    createdRole.name,
    originalRoleName,
  );
  TestValidator.equals(
    "role permissions remain original after rejection",
    createdRole.permissions.map((permission) => permission.permission),
    originalPermissionCodes,
  );
  TestValidator.equals(
    "role updated_at snapshot remains unchanged in local object",
    createdRole.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "role built_in flag remains unchanged after rejection",
    createdRole.built_in,
    originalBuiltIn,
  );
}
