import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_roles_create } from "../../../generate/generate_random_hrm_time_tracking_member_roles_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";

export async function test_api_role_permission_bundle_update_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const role = await generate_random_hrm_time_tracking_member_roles_create(
    memberConnection,
    {
      body: {
        name: `${RandomGenerator.name(2)} role`,
        code: RandomGenerator.alphabets(8),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        sortOrder: typia.random<number & tags.Type<"int32">>(),
      } satisfies IHrmTimeTrackingRole.ICreate,
    },
  );
  typia.assert(role);
  const permissionIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const updated =
    await api.functional.hrmTimeTracking.member.roles.permissions.updatePermissions(
      memberConnection,
      {
        roleId: role.id,
        body: {
          permissionIds,
        } satisfies IHrmTimeTrackingRole.IUpdatePermission,
      },
    );
  typia.assert(updated);
  TestValidator.equals("role id should remain the same", updated.id, role.id);
  TestValidator.equals(
    "organization id should remain the same",
    updated.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "role name should remain unchanged",
    updated.name,
    role.name,
  );
  TestValidator.equals(
    "role code should remain unchanged",
    updated.code,
    role.code,
  );
  TestValidator.equals(
    "role description should remain unchanged",
    updated.description,
    role.description,
  );
  TestValidator.predicate(
    "updated role remains a custom role",
    updated.is_builtin === false,
  );
}
