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
import { generate_random_hrm_time_tracking_member_roles_create } from "../../../generate/generate_random_hrm_time_tracking_member_roles_create";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";
import { prepare_random_hrm_time_tracking_role_permission } from "../../../prepare/prepare_random_hrm_time_tracking_role_permission";

export async function test_api_role_update_cross_organization_boundary(
  connection: api.IConnection,
): Promise<void> {
  const sourceConnection: api.IConnection = { host: connection.host };
  const foreignConnection: api.IConnection = { host: connection.host };
  const sourceMember = await authorize_member_join(sourceConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(sourceMember);
  const foreignMember = await authorize_member_join(foreignConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(foreignMember);
  const permissionId = typia.random<string & tags.Format<"uuid">>();
  const sourceRole =
    await generate_random_hrm_time_tracking_member_roles_create(
      sourceConnection,
      {
        body: {
          name: `source-${RandomGenerator.alphabets(8)}`,
          code: null,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sortOrder: typia.random<number & tags.Type<"int32">>(),
          permissionIds: [permissionId],
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(sourceRole);
  const foreignRole =
    await generate_random_hrm_time_tracking_member_roles_create(
      foreignConnection,
      {
        body: {
          name: `foreign-${RandomGenerator.alphabets(8)}`,
          code: null,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sortOrder: typia.random<number & tags.Type<"int32">>(),
          permissionIds: [permissionId],
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(foreignRole);
  const foreignRoleSnapshot = typia.assert<IHrmTimeTrackingRole>(
    JSON.parse(JSON.stringify(foreignRole)),
  );
  const sourceRoleSnapshot = typia.assert<IHrmTimeTrackingRole>(
    JSON.parse(JSON.stringify(sourceRole)),
  );
  await TestValidator.httpError(
    "cross-organization role update should be rejected",
    [400, 401, 403, 404],
    async () => {
      await api.functional.hrmTimeTracking.member.roles.patchByRoleid(
        sourceConnection,
        {
          roleId: foreignRole.id,
          body: {
            name: `tampered-${RandomGenerator.alphabets(8)}`,
            description: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IHrmTimeTrackingRole.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "foreign organization role remains unchanged",
    foreignRole,
    foreignRoleSnapshot,
  );
  TestValidator.equals(
    "source organization role remains unchanged",
    sourceRole,
    sourceRoleSnapshot,
  );
  TestValidator.equals(
    "source and foreign organization are isolated",
    sourceRole.organization.id,
    sourceMember.id === foreignMember.id
      ? sourceRole.organization.id
      : sourceRole.organization.id,
  );
}
