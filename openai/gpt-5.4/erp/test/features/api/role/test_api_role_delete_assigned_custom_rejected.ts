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

export async function test_api_role_delete_assigned_custom_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/owners/join",
    referrer: "https://example.com/owners",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingOwner.IJoin;
  const authorized = await authorize_owner_join(ownerConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const organizationBody = {
    name: `Org ${RandomGenerator.name()}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://example.com/logo.png",
    currency_code: "USD",
    timezone: "Asia/Seoul",
    fiscal_start_month: 1,
  } satisfies IHrmTimeTrackingOrganization.ICreate;
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: organizationBody,
      },
    );
  typia.assert(organization);
  const roleBody = {
    name: `custom-role-${RandomGenerator.alphabets(8)}`,
    permissions: [
      {
        permissions: ["employee:view", "time:view_all"],
      },
    ],
  } satisfies IHrmTimeTrackingRole.ICreate;
  const role =
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
  TestValidator.equals(
    "role organization matches",
    role.organization.id,
    organization.id,
  );
  TestValidator.equals("role name matches request", role.name, roleBody.name);
  TestValidator.equals("role is custom", role.built_in, false);
  TestValidator.predicate("role has permissions", role.permissions.length > 0);
  await TestValidator.error(
    "assigned custom role deletion is rejected",
    async () => {
      await api.functional.hrmTimeTracking.owner.organizations.roles.erase(
        ownerConnection,
        {
          organizationId: organization.id,
          roleId: role.id,
        },
      );
    },
  );
}
