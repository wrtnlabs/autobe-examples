import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_roles_create } from "../../../generate/generate_random_erp_hrm_time_member_roles_create";
import { prepare_random_erp_hrm_time_role } from "../../../prepare/prepare_random_erp_hrm_time_role";

export async function test_api_role_create_custom_role_only_not_builtin(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const created = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(created);
  const roleName = `custom-role-${RandomGenerator.alphabets(8)}`;
  const customRole = await generate_random_erp_hrm_time_member_roles_create(
    memberConnection,
    {
      body: {
        name: roleName,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(customRole);
  TestValidator.equals(
    "custom role name should match",
    customRole.name,
    roleName,
  );
  TestValidator.equals(
    "custom role should be marked as organization role, not built-in",
    customRole.isBuiltin,
    false,
  );
  TestValidator.predicate(
    "custom role should have an id",
    customRole.id.length > 0,
  );
  TestValidator.predicate(
    "custom role should include the owning organization reference",
    customRole.organization !== null && customRole.organization !== undefined,
  );
  TestValidator.equals(
    "custom role permissions should be returned as an array",
    Array.isArray(customRole.permissions),
    true,
  );
  const builtinLikeNames = ["Owner", "Manager", "Employee"] as const;
  const builtinLikeName = RandomGenerator.pick(builtinLikeNames);
  const builtinLikeRole =
    await generate_random_erp_hrm_time_member_roles_create(memberConnection, {
      body: {
        name: `${builtinLikeName}-${RandomGenerator.alphabets(6)}`,
        description: `Attempting to seed ${builtinLikeName} via normal role creation should still create a custom role.`,
      } satisfies IErpHrmTimeRole.ICreate,
    });
  typia.assert(builtinLikeRole);
  TestValidator.equals(
    "builtin-like name should still create a non-built-in role",
    builtinLikeRole.isBuiltin,
    false,
  );
  TestValidator.predicate(
    "builtin-like role should be a distinct created record",
    builtinLikeRole.id !== customRole.id,
  );
}
