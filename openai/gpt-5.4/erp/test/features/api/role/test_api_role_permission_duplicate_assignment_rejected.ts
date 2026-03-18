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

export async function test_api_role_permission_duplicate_assignment_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {});
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1 satisfies number as number & tags.Type<"int32">,
        },
      },
    );
  typia.assert(organization);
  const duplicatedPermission = "employee:view" as const;
  const role =
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
              permissions: [duplicatedPermission],
            },
          ],
        },
      },
    );
  typia.assert(role);
  const beforePermissions = role.permissions.map(
    (permission) => permission.permission,
  );
  TestValidator.equals(
    "role belongs to created organization",
    role.organization.id,
    organization.id,
  );
  TestValidator.equals("role is custom", role.built_in, false);
  TestValidator.equals(
    "initial permission set preserved in created role",
    beforePermissions,
    [duplicatedPermission],
  );
  TestValidator.predicate(
    "initial permission assigned exactly once",
    beforePermissions.filter(
      (permission) => permission === duplicatedPermission,
    ).length === 1,
  );
  await TestValidator.error(
    "duplicate permission assignment is rejected",
    async () => {
      await generate_random_hrm_time_tracking_owner_organizations_roles_permissions_create(
        ownerConnection,
        {
          params: {
            organizationId: organization.id,
            roleId: role.id,
          },
          body: {
            permissions: [duplicatedPermission],
          },
        },
      );
    },
  );
  const afterRejectedAttemptPermissions = role.permissions.map(
    (permission) => permission.permission,
  );
  TestValidator.equals(
    "permission set remains unchanged after rejected duplicate attempt",
    afterRejectedAttemptPermissions,
    beforePermissions,
  );
  TestValidator.predicate(
    "no duplicate permission exists in preserved role snapshot",
    afterRejectedAttemptPermissions.filter(
      (permission) => permission === duplicatedPermission,
    ).length === 1,
  );
}
