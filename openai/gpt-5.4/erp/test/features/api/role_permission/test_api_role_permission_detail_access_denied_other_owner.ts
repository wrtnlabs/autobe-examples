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

export async function test_api_role_permission_detail_access_denied_other_owner(
  connection: api.IConnection,
): Promise<void> {
  const firstOwnerConnection: api.IConnection = { host: connection.host };
  const firstOwner = await authorize_owner_join(firstOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(firstOwner);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      firstOwnerConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 3 satisfies number as number & tags.Type<"int32">,
        },
      },
    );
  typia.assert(organization);
  const initialPermission = "employee:view" as const;
  const role =
    await generate_random_hrm_time_tracking_owner_organizations_roles_create(
      firstOwnerConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          name: `role-${RandomGenerator.alphabets(8)}`,
          permissions: [{ permissions: [initialPermission] }],
        },
      },
    );
  typia.assert(role);
  const protectedPermission = "report:view" as const;
  const roleWithPermission =
    await generate_random_hrm_time_tracking_owner_organizations_roles_permissions_create(
      firstOwnerConnection,
      {
        params: {
          organizationId: organization.id,
          roleId: role.id,
        },
        body: {
          permissions: [protectedPermission],
        },
      },
    );
  typia.assert(roleWithPermission);
  const permissionAssignment = roleWithPermission.permissions.find(
    (permission) => permission.permission === protectedPermission,
  );
  TestValidator.predicate(
    "created protected permission assignment exists",
    permissionAssignment !== undefined,
  );
  const safePermissionAssignment = typia.assert(permissionAssignment!);
  const secondOwnerConnection: api.IConnection = { host: connection.host };
  const secondOwner = await authorize_owner_join(secondOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(secondOwner);
  await TestValidator.httpError(
    "other owner cannot read foreign organization role permission detail",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.owner.organizations.roles.permissions.at(
        secondOwnerConnection,
        {
          organizationId: organization.id,
          roleId: role.id,
          permissionId: safePermissionAssignment.id,
        },
      );
    },
  );
}
