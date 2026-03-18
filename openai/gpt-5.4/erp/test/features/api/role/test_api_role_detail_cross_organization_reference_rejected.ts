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

export async function test_api_role_detail_cross_organization_reference_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const organizationOne =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `Org ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1 satisfies number as number & tags.Type<"int32">,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organizationOne);
  const organizationTwo =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `Org ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 2 satisfies number as number & tags.Type<"int32">,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organizationTwo);
  TestValidator.notEquals(
    "organizations must be distinct",
    organizationOne.id,
    organizationTwo.id,
  );
  const roleBody = {
    name: `custom-role-${RandomGenerator.alphabets(8)}`,
    permissions: [
      {
        permissions: ["employee:view", "report:view"],
      } satisfies IHrmTimeTrackingRolePermission.ICreate,
    ],
  } satisfies IHrmTimeTrackingRole.ICreate;
  const role =
    await generate_random_hrm_time_tracking_owner_organizations_roles_create(
      ownerConnection,
      {
        params: {
          organizationId: organizationOne.id,
        },
        body: roleBody,
      },
    );
  typia.assert(role);
  TestValidator.equals(
    "role belongs to first organization",
    role.organization.id,
    organizationOne.id,
  );
  TestValidator.equals("role name matches input", role.name, roleBody.name);
  TestValidator.equals("custom role is not built in", role.built_in, false);
  const correctLookup =
    await api.functional.hrmTimeTracking.owner.organizations.roles.at(
      ownerConnection,
      {
        organizationId: organizationOne.id,
        roleId: role.id,
      },
    );
  typia.assert(correctLookup);
  TestValidator.equals(
    "correct lookup organization matches first organization",
    correctLookup.organization.id,
    organizationOne.id,
  );
  TestValidator.equals(
    "correct lookup role id matches",
    correctLookup.id,
    role.id,
  );
  TestValidator.equals(
    "correct lookup role name matches created role",
    correctLookup.name,
    roleBody.name,
  );
  await TestValidator.httpError(
    "cross-organization role detail lookup is rejected",
    404,
    async () => {
      await api.functional.hrmTimeTracking.owner.organizations.roles.at(
        ownerConnection,
        {
          organizationId: organizationTwo.id,
          roleId: role.id,
        },
      );
    },
  );
}
