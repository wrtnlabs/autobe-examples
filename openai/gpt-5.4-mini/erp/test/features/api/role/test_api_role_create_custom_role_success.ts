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
import { generate_random_hrm_time_tracking_member_roles_create } from "../../../generate/generate_random_hrm_time_tracking_member_roles_create";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";

export async function test_api_role_create_custom_role_success(
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
  const roleName = `custom-role-${RandomGenerator.alphabets(8)}`;
  const roleCode = `custom_${RandomGenerator.alphabets(6)}`;
  const roleDescription = RandomGenerator.paragraph({ sentences: 2 });
  const sortOrder = 1 as number & tags.Type<"int32">;
  const created = await api.functional.hrmTimeTracking.member.roles.create(
    memberConnection,
    {
      body: {
        name: roleName,
        code: roleCode,
        description: roleDescription,
        sortOrder,
      } satisfies IHrmTimeTrackingRole.ICreate,
    },
  );
  typia.assert(created);
  TestValidator.equals("role name should match", created.name, roleName);
  TestValidator.equals("role code should match", created.code, roleCode);
  TestValidator.equals(
    "role description should match",
    created.description,
    roleDescription,
  );
  TestValidator.equals("role should be custom", created.is_builtin, false);
  TestValidator.equals(
    "role sort order should match",
    created.sort_order,
    sortOrder,
  );
  TestValidator.predicate(
    "role organization summary should exist",
    created.organization.id.length > 0 && created.organization.name.length > 0,
  );
  TestValidator.predicate(
    "role should remain available in the current organization context",
    created.id.length > 0 && created.updated_at >= created.created_at,
  );
}
