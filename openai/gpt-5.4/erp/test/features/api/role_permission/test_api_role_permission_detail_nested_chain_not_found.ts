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

export async function test_api_role_permission_detail_nested_chain_not_found(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
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
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
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
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 12,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organizationTwo);
  const roleOne =
    await generate_random_hrm_time_tracking_owner_organizations_roles_create(
      ownerConnection,
      {
        params: {
          organizationId: organizationOne.id,
        },
        body: {
          name: `role-one-${RandomGenerator.alphabets(8)}`,
          permissions: [
            {
              permissions: ["employee:view"],
            } satisfies IHrmTimeTrackingRolePermission.ICreate,
          ],
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(roleOne);
  const roleOneWithExtraPermission =
    await generate_random_hrm_time_tracking_owner_organizations_roles_permissions_create(
      ownerConnection,
      {
        params: {
          organizationId: organizationOne.id,
          roleId: roleOne.id,
        },
        body: {
          permissions: ["report:view"],
        } satisfies IHrmTimeTrackingRolePermission.ICreate,
      },
    );
  typia.assert(roleOneWithExtraPermission);
  const locatedPermission = roleOneWithExtraPermission.permissions.find(
    (permission) => permission.permission === "report:view",
  );
  TestValidator.predicate(
    "target permission exists on role one",
    locatedPermission !== undefined,
  );
  const targetPermission: IHrmTimeTrackingRolePermission = typia.assert(
    locatedPermission!,
  );
  const roleTwo =
    await generate_random_hrm_time_tracking_owner_organizations_roles_create(
      ownerConnection,
      {
        params: {
          organizationId: organizationTwo.id,
        },
        body: {
          name: `role-two-${RandomGenerator.alphabets(8)}`,
          permissions: [
            {
              permissions: ["project:view"],
            } satisfies IHrmTimeTrackingRolePermission.ICreate,
          ],
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(roleTwo);
  TestValidator.equals(
    "role one belongs to organization one",
    roleOne.organization.id,
    organizationOne.id,
  );
  TestValidator.equals(
    "target permission belongs to role one",
    targetPermission.role.id,
    roleOne.id,
  );
  TestValidator.equals(
    "target permission belongs to organization one via role",
    targetPermission.role.organization.id,
    organizationOne.id,
  );
  TestValidator.equals(
    "role two belongs to organization two",
    roleTwo.organization.id,
    organizationTwo.id,
  );
  TestValidator.notEquals(
    "organizations differ",
    organizationOne.id,
    organizationTwo.id,
  );
  TestValidator.notEquals("roles differ", roleOne.id, roleTwo.id);
  const validPermissionDetail =
    await api.functional.hrmTimeTracking.owner.organizations.roles.permissions.at(
      ownerConnection,
      {
        organizationId: organizationOne.id,
        roleId: roleOne.id,
        permissionId: targetPermission.id,
      },
    );
  typia.assert(validPermissionDetail);
  TestValidator.equals(
    "valid detail returns the target permission id",
    validPermissionDetail.id,
    targetPermission.id,
  );
  TestValidator.equals(
    "valid detail returns the target permission code",
    validPermissionDetail.permission,
    targetPermission.permission,
  );
  TestValidator.equals(
    "valid detail preserves owning role",
    validPermissionDetail.role.id,
    roleOne.id,
  );
  TestValidator.equals(
    "valid detail preserves owning organization",
    validPermissionDetail.role.organization.id,
    organizationOne.id,
  );
  await TestValidator.httpError(
    "rejects permission detail when organization and role chain is mismatched",
    404,
    async () => {
      await api.functional.hrmTimeTracking.owner.organizations.roles.permissions.at(
        ownerConnection,
        {
          organizationId: organizationTwo.id,
          roleId: roleOne.id,
          permissionId: targetPermission.id,
        },
      );
    },
  );
  await TestValidator.httpError(
    "rejects permission detail when role and permission chain is mismatched",
    404,
    async () => {
      await api.functional.hrmTimeTracking.owner.organizations.roles.permissions.at(
        ownerConnection,
        {
          organizationId: organizationOne.id,
          roleId: roleTwo.id,
          permissionId: targetPermission.id,
        },
      );
    },
  );
}
