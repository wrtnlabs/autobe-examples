import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_role_delete_built_in_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(authorized);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-${RandomGenerator.name(2)}-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
        },
      },
    );
  typia.assert(organization);
  const builtInRequest = {
    built_in: true,
    page: 1,
    limit: 100,
  } satisfies IHrmTimeTrackingRole.IRequest;
  const builtInRolesPage =
    await api.functional.hrmTimeTracking.owner.organizations.roles.index(
      ownerConnection,
      {
        organizationId: organization.id,
        body: builtInRequest,
      },
    );
  typia.assert(builtInRolesPage);
  TestValidator.predicate(
    "built-in role catalog is not empty",
    builtInRolesPage.data.length > 0,
  );
  const targetRole = builtInRolesPage.data[0];
  TestValidator.equals(
    "target role belongs to organization",
    targetRole.organization.id,
    organization.id,
  );
  TestValidator.equals("target role is built-in", targetRole.built_in, true);
  const beforeSnapshot = builtInRolesPage.data.map((role) => ({
    id: role.id,
    name: role.name,
    built_in: role.built_in,
    deleted_at: role.deleted_at,
    organization_id: role.organization.id,
  }));
  await TestValidator.error("built-in role deletion is rejected", async () => {
    await api.functional.hrmTimeTracking.owner.organizations.roles.erase(
      ownerConnection,
      {
        organizationId: organization.id,
        roleId: targetRole.id,
      },
    );
  });
  const builtInRolesPageAfter =
    await api.functional.hrmTimeTracking.owner.organizations.roles.index(
      ownerConnection,
      {
        organizationId: organization.id,
        body: builtInRequest,
      },
    );
  typia.assert(builtInRolesPageAfter);
  TestValidator.equals(
    "built-in role count remains unchanged",
    builtInRolesPageAfter.data.length,
    builtInRolesPage.data.length,
  );
  const targetRoleAfter = typia.assert(
    builtInRolesPageAfter.data.find((role) => role.id === targetRole.id)!,
  );
  TestValidator.equals(
    "target built-in role remains present after failed deletion",
    targetRoleAfter.id,
    targetRole.id,
  );
  TestValidator.equals(
    "target role still belongs to organization",
    targetRoleAfter.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "target role remains built-in",
    targetRoleAfter.built_in,
    true,
  );
  const afterSnapshot = builtInRolesPageAfter.data.map((role) => ({
    id: role.id,
    name: role.name,
    built_in: role.built_in,
    deleted_at: role.deleted_at,
    organization_id: role.organization.id,
  }));
  TestValidator.equals(
    "built-in role catalog remains unchanged after rejected deletion",
    afterSnapshot,
    beforeSnapshot,
  );
}
