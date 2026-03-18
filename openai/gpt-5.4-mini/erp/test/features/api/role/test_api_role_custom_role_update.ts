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

export async function test_api_role_custom_role_update(
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
  const roleId = typia.random<string & tags.Format<"uuid">>();
  const nextName = RandomGenerator.name();
  const nextCode = RandomGenerator.alphabets(8);
  const nextDescription = RandomGenerator.paragraph({ sentences: 2 });
  const nextSortOrder = typia.random<number & tags.Type<"int32">>();
  const permissionIds = [
    typia.random<string & tags.Format<"uuid">>(),
  ] satisfies string[];
  const updated = await api.functional.hrmTimeTracking.member.roles.putByRoleid(
    memberConnection,
    {
      roleId,
      body: {
        name: nextName,
        code: nextCode,
        description: nextDescription,
        sortOrder: nextSortOrder,
        permissions: [
          { permissionIds },
        ] satisfies IHrmTimeTrackingRolePermission.ICreate[],
      } satisfies IHrmTimeTrackingRole.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals("updated role name", updated.name, nextName);
  TestValidator.equals("updated role code", updated.code, nextCode);
  TestValidator.equals(
    "updated role description",
    updated.description,
    nextDescription,
  );
  TestValidator.equals(
    "updated role sort order",
    updated.sort_order,
    nextSortOrder,
  );
  TestValidator.predicate(
    "updated role remains within an organization",
    updated.organization.id.length > 0,
  );
  TestValidator.predicate(
    "updated role is treated as a custom role in this scenario",
    updated.is_builtin === false,
  );
}
