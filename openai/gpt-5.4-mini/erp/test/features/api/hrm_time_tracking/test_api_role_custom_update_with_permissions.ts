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
import { prepare_random_hrm_time_tracking_role_permission } from "../../../prepare/prepare_random_hrm_time_tracking_role_permission";

export async function test_api_role_custom_update_with_permissions(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  const roleId = typia.random<string & tags.Format<"uuid">>();
  const permissionIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const body = {
    name: `${RandomGenerator.name(2)} ${RandomGenerator.alphabets(4)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    sortOrder: typia.random<number & tags.Type<"int32">>(),
    permissions: [
      {
        permissionIds,
      } satisfies IHrmTimeTrackingRolePermission.ICreate,
    ],
  } satisfies IHrmTimeTrackingRole.IUpdate;
  const output =
    await api.functional.hrmTimeTracking.member.roles.patchByRoleid(
      memberConnection,
      {
        roleId,
        body,
      },
    );
  typia.assert(output);
  TestValidator.equals("updated role id", output.id, roleId);
  TestValidator.equals("updated role name", output.name, body.name);
  TestValidator.equals(
    "updated role description",
    output.description,
    body.description,
  );
  TestValidator.equals(
    "updated role sort order",
    output.sort_order,
    body.sortOrder,
  );
  TestValidator.predicate(
    "role belongs to an organization",
    output.organization.id.length > 0,
  );
  TestValidator.predicate(
    "organization name exists",
    output.organization.name.length > 0,
  );
  TestValidator.predicate(
    "organization currency exists",
    output.organization.currency.length > 0,
  );
  TestValidator.predicate("role is not builtin", output.is_builtin === false);
}
