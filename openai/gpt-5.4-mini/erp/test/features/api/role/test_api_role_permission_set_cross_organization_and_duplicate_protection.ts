import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
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
import { generate_random_hrm_time_tracking_member_roles_permissions_create } from "../../../generate/generate_random_hrm_time_tracking_member_roles_permissions_create";
import { prepare_random_hrm_time_tracking_role_permission } from "../../../prepare/prepare_random_hrm_time_tracking_role_permission";

export async function test_api_role_permission_set_cross_organization_and_duplicate_protection(
  connection: api.IConnection,
): Promise<void> {
  const authConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(authConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const roleId = typia.random<string & tags.Format<"uuid">>();
  const permissionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "duplicate permission IDs must be rejected",
    [400, 409, 422],
    async () => {
      await generate_random_hrm_time_tracking_member_roles_permissions_create(
        authConnection,
        {
          params: { roleId },
          body: {
            permissionIds: [permissionId, permissionId],
          } satisfies IHrmTimeTrackingRolePermission.ICreate,
        },
      );
    },
  );
  await TestValidator.httpError(
    "cross-organization or inaccessible role updates must be rejected",
    [401, 403, 404],
    async () => {
      await generate_random_hrm_time_tracking_member_roles_permissions_create(
        authConnection,
        {
          params: { roleId },
          body: {
            permissionIds: [typia.random<string & tags.Format<"uuid">>()],
          } satisfies IHrmTimeTrackingRolePermission.ICreate,
        },
      );
    },
  );
}
