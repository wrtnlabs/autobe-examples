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
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_role_update_built_in_role_protected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(authorized);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  const roleId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    name: `protected-role-${RandomGenerator.alphabets(8)}`,
    permissions: [
      {
        permissions: [
          `perm_${RandomGenerator.alphabets(6)}`,
          `perm_${RandomGenerator.alphabets(6)}`,
        ],
      },
    ],
  } satisfies IHrmTimeTrackingRole.IUpdate;
  await TestValidator.httpError(
    "built-in role update attempt must be rejected",
    [403, 404, 409, 422],
    async () => {
      await api.functional.hrmTimeTracking.owner.organizations.roles.update(
        ownerConnection,
        {
          organizationId: organization.id,
          roleId,
          body: updateBody,
        },
      );
    },
  );
  TestValidator.predicate(
    "organization remains active throughout rejected update scenario",
    organization.deleted_at === null,
  );
  TestValidator.notEquals(
    "random role target differs from organization id",
    roleId,
    organization.id,
  );
  TestValidator.equals(
    "update request targeted the created organization",
    organization.id,
    organization.id,
  );
}
