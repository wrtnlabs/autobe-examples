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

export async function test_api_role_permission_addition_to_custom_role(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  typia.assert(
    await authorize_owner_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "OwnerTest1234!" satisfies string as string &
          tags.Format<"password">,
        href: "https://example.com/hrm/owner/join" satisfies string as string &
          tags.Format<"uri">,
        referrer: "https://example.com/hrm" satisfies string as string &
          tags.Format<"uri">,
      } satisfies IHrmTimeTrackingOwner.IJoin,
    }),
  );
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `Org ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_uri: "https://example.com/logo.png" satisfies string as string &
            tags.Format<"uri">,
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1 satisfies number as number & tags.Type<"int32">,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
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
          permissions: initialPermissions.map((permission) => ({
            permissions: [permission],
          })),
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(createdRole);
  const additionalPermissions = ["time:approve", "report:view"] as const;
  const updatedRole =
    await generate_random_hrm_time_tracking_owner_organizations_roles_permissions_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
          roleId: createdRole.id,
        },
        body: {
          permissions: [...additionalPermissions],
        } satisfies IHrmTimeTrackingRolePermission.ICreate,
      },
    );
  typia.assert(updatedRole);
  TestValidator.equals("same role id", updatedRole.id, createdRole.id);
  TestValidator.equals(
    "same organization id",
    updatedRole.organization.id,
    createdRole.organization.id,
  );
  TestValidator.equals(
    "organization name preserved",
    updatedRole.organization.name,
    organization.name,
  );
  TestValidator.equals("role remains custom", updatedRole.built_in, false);
  TestValidator.notEquals(
    "role updated timestamp changed",
    updatedRole.updated_at,
    createdRole.updated_at,
  );
  for (const permission of initialPermissions) {
    TestValidator.predicate(
      `initial permission preserved: ${permission}`,
      updatedRole.permissions.some(
        (assignment) =>
          assignment.permission === permission &&
          assignment.deleted_at === null,
      ),
    );
  }
  for (const permission of additionalPermissions) {
    TestValidator.predicate(
      `additional permission added: ${permission}`,
      updatedRole.permissions.some(
        (assignment) =>
          assignment.permission === permission &&
          assignment.deleted_at === null,
      ),
    );
  }
  TestValidator.equals(
    "all active permissions present",
    updatedRole.permissions.filter(
      (assignment) => assignment.deleted_at === null,
    ).length,
    initialPermissions.length + additionalPermissions.length,
  );
}
