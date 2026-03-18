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

export async function test_api_role_retrieve_current_organization_role(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  const role = await api.functional.hrmTimeTracking.member.roles.at(
    memberConnection,
    {
      roleId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(role);
  TestValidator.equals("role id should be stable", role.id, role.id);
  TestValidator.equals(
    "organization summary should be stable",
    role.organization,
    role.organization,
  );
  TestValidator.equals("role name should be stable", role.name, role.name);
  TestValidator.equals("role code should be stable", role.code, role.code);
  TestValidator.equals(
    "role description should be stable",
    role.description,
    role.description,
  );
  TestValidator.equals(
    "built-in flag should be stable",
    role.is_builtin,
    role.is_builtin,
  );
  TestValidator.equals(
    "sort order should be stable",
    role.sort_order,
    role.sort_order,
  );
  TestValidator.equals(
    "created timestamp should be stable",
    role.created_at,
    role.created_at,
  );
  TestValidator.equals(
    "updated timestamp should be stable",
    role.updated_at,
    role.updated_at,
  );
  TestValidator.equals(
    "deleted timestamp should be stable",
    role.deleted_at,
    role.deleted_at,
  );
}
