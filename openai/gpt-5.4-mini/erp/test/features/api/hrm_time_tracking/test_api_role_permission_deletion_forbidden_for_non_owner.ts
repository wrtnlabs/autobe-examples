import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingPermission";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_roles_create } from "../../../generate/generate_random_hrm_time_tracking_member_roles_create";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";

export async function test_api_role_permission_deletion_forbidden_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(owner);
  const ownerRole = await generate_random_hrm_time_tracking_member_roles_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        code: RandomGenerator.alphabets(8),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        sortOrder: typia.random<number & tags.Type<"int32">>(),
      } satisfies IHrmTimeTrackingRole.ICreate,
    },
  );
  typia.assert(ownerRole);
  const originalGrant =
    await api.functional.hrmTimeTracking.member.roles.permissions.getByRoleid(
      ownerConnection,
      {
        roleId: ownerRole.id,
      },
    );
  typia.assert(originalGrant);
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwner = await authorize_member_join(nonOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(nonOwner);
  await TestValidator.httpError(
    "non-owner cannot delete role permission",
    403,
    async () => {
      await api.functional.hrmTimeTracking.member.roles.permissions.erasePermission(
        nonOwnerConnection,
        {
          roleId: ownerRole.id,
          rolePermissionId: originalGrant.id,
        },
      );
    },
  );
  const grantAfter =
    await api.functional.hrmTimeTracking.member.roles.permissions.getByRoleid(
      ownerConnection,
      {
        roleId: ownerRole.id,
      },
    );
  typia.assert(grantAfter);
  TestValidator.equals(
    "role permission id remains unchanged",
    grantAfter.id,
    originalGrant.id,
  );
  TestValidator.equals(
    "role permission role binding remains unchanged",
    grantAfter.hrm_time_tracking_role_id,
    originalGrant.hrm_time_tracking_role_id,
  );
  TestValidator.equals(
    "role permission granted permission remains unchanged",
    grantAfter.permission_id,
    originalGrant.permission_id,
  );
  TestValidator.equals(
    "role permission record remains unchanged",
    grantAfter,
    originalGrant,
  );
}
