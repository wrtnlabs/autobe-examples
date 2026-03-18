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

export async function test_api_role_delete_custom_unassigned(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Aa1!" + RandomGenerator.alphaNumeric(12),
    href: "https://example.com/owners/join",
    referrer: "https://example.com/owners",
    ip: "127.0.0.1",
  } satisfies IHrmTimeTrackingOwner.IJoin;
  const owner: IHrmTimeTrackingOwner.IAuthorized = await authorize_owner_join(
    ownerConnection,
    {
      body: ownerJoinBody,
    },
  );
  typia.assert(owner);
  TestValidator.equals(
    "owner email matches join input",
    owner.email,
    ownerJoinBody.email,
  );
  TestValidator.equals("owner deleted_at is null", owner.deleted_at, null);
  TestValidator.equals(
    "owner deactivated_at is null",
    owner.deactivated_at,
    null,
  );
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `Org ${RandomGenerator.name(2)} ${RandomGenerator.alphabets(4)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: "https://example.com/logo.png",
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies Partial<IHrmTimeTrackingOrganization.ICreate>,
      },
    );
  typia.assert(organization);
  const requestedPermissions = ["employee:view", "project:view"] as const;
  const roleBody = {
    name: `Custom Role ${RandomGenerator.alphabets(6)}`,
    permissions: [
      {
        permissions: [...requestedPermissions],
      } satisfies IHrmTimeTrackingRolePermission.ICreate,
    ],
  } satisfies IHrmTimeTrackingRole.ICreate;
  const role: IHrmTimeTrackingRole =
    await generate_random_hrm_time_tracking_owner_organizations_roles_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: roleBody,
      },
    );
  typia.assert(role);
  TestValidator.equals("role name matches input", role.name, roleBody.name);
  TestValidator.equals(
    "role belongs to organization",
    role.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "role organization name matches",
    role.organization.name,
    organization.name,
  );
  TestValidator.equals("role is custom", role.built_in, false);
  TestValidator.equals(
    "role deleted_at is null before deletion",
    role.deleted_at,
    null,
  );
  TestValidator.equals(
    "role permission count matches request",
    role.permissions.length,
    requestedPermissions.length,
  );
  TestValidator.predicate(
    "role contains requested permission employee:view",
    ArrayUtil.has(
      role.permissions,
      (permission) => permission.permission === "employee:view",
    ),
  );
  TestValidator.predicate(
    "role contains requested permission project:view",
    ArrayUtil.has(
      role.permissions,
      (permission) => permission.permission === "project:view",
    ),
  );
  const ownerSnapshot = {
    id: owner.id,
    email: owner.email,
    deleted_at: owner.deleted_at,
    deactivated_at: owner.deactivated_at,
  };
  const organizationSnapshot = {
    id: organization.id,
    name: organization.name,
    description: organization.description,
    logo_uri: organization.logo_uri,
    currency_code: organization.currency_code,
    timezone: organization.timezone,
    fiscal_start_month: organization.fiscal_start_month,
    deleted_at: organization.deleted_at,
  };
  await api.functional.hrmTimeTracking.owner.organizations.roles.erase(
    ownerConnection,
    {
      organizationId: organization.id,
      roleId: role.id,
    },
  );
  TestValidator.equals(
    "owner id unchanged after role deletion",
    owner.id,
    ownerSnapshot.id,
  );
  TestValidator.equals(
    "owner email unchanged after role deletion",
    owner.email,
    ownerSnapshot.email,
  );
  TestValidator.equals(
    "owner remains not deleted after role deletion",
    owner.deleted_at,
    ownerSnapshot.deleted_at,
  );
  TestValidator.equals(
    "owner remains not deactivated after role deletion",
    owner.deactivated_at,
    ownerSnapshot.deactivated_at,
  );
  TestValidator.equals(
    "organization id unchanged after role deletion",
    organization.id,
    organizationSnapshot.id,
  );
  TestValidator.equals(
    "organization name unchanged after role deletion",
    organization.name,
    organizationSnapshot.name,
  );
  TestValidator.equals(
    "organization description unchanged after role deletion",
    organization.description,
    organizationSnapshot.description,
  );
  TestValidator.equals(
    "organization logo unchanged after role deletion",
    organization.logo_uri,
    organizationSnapshot.logo_uri,
  );
  TestValidator.equals(
    "organization currency unchanged after role deletion",
    organization.currency_code,
    organizationSnapshot.currency_code,
  );
  TestValidator.equals(
    "organization timezone unchanged after role deletion",
    organization.timezone,
    organizationSnapshot.timezone,
  );
  TestValidator.equals(
    "organization fiscal month unchanged after role deletion",
    organization.fiscal_start_month,
    organizationSnapshot.fiscal_start_month,
  );
  TestValidator.equals(
    "organization remains active after role deletion",
    organization.deleted_at,
    organizationSnapshot.deleted_at,
  );
}
