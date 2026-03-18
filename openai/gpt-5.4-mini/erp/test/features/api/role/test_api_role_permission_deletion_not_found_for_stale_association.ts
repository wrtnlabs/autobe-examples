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

export async function test_api_role_permission_deletion_not_found_for_stale_association(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const role = await generate_random_hrm_time_tracking_member_roles_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        code: RandomGenerator.alphaNumeric(8),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        sortOrder: typia.random<number & tags.Type<"int32">>(),
      } satisfies IHrmTimeTrackingRole.ICreate,
    },
  );
  typia.assert(role);
  const permissionsBefore =
    await api.functional.hrmTimeTracking.member.roles.permissions.getByRoleid(
      ownerConnection,
      { roleId: role.id },
    );
  typia.assert(permissionsBefore);
  const staleRolePermissionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete role-permission association should fail with not found for stale linkage",
    404,
    async () => {
      await api.functional.hrmTimeTracking.member.roles.permissions.erasePermission(
        ownerConnection,
        {
          roleId: role.id,
          rolePermissionId: staleRolePermissionId,
        },
      );
    },
  );
  const permissionsAfter =
    await api.functional.hrmTimeTracking.member.roles.permissions.getByRoleid(
      ownerConnection,
      { roleId: role.id },
    );
  typia.assert(permissionsAfter);
  TestValidator.equals(
    "role permissions should remain unchanged after failed delete",
    permissionsAfter,
    permissionsBefore,
  );
}
