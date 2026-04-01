import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering roles by builtin status to distinguish system-defined roles from custom roles.
 *
 * This test validates the is_builtin filter functionality on the roles endpoint:
 * 1. Authenticate as a member to access organization-scoped role list
 * 2. Filter roles with is_builtin=true to retrieve only built-in roles
 * 3. Validate all returned roles have is_builtin=true
 * 4. Filter roles with is_builtin=false to retrieve only custom roles
 * 5. Validate all returned roles have is_builtin=false
 * 6. Verify pagination metadata correctly reflects filtered result counts
 */
export async function test_api_role_filter_by_builtin_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Filter roles with is_builtin=true to get built-in roles
  const builtinRolesResponse =
    await api.functional.hrmPlatform.member.roles.index(memberConnection, {
      body: {
        is_builtin: true,
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformRole.IRequest,
    });
  typia.assert(builtinRolesResponse);
  // 3. Validate all built-in roles have is_builtin=true
  TestValidator.predicate(
    "all builtin roles have is_builtin=true",
    builtinRolesResponse.data.every((role) => role.is_builtin === true),
  );
  // Validate pagination for builtin roles
  TestValidator.equals(
    "builtin roles pagination current",
    builtinRolesResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "builtin roles pagination records matches data length",
    builtinRolesResponse.pagination.records >= builtinRolesResponse.data.length,
  );
  // 4. Filter roles with is_builtin=false to get custom roles
  const customRolesResponse =
    await api.functional.hrmPlatform.member.roles.index(memberConnection, {
      body: {
        is_builtin: false,
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformRole.IRequest,
    });
  typia.assert(customRolesResponse);
  // 5. Validate all custom roles have is_builtin=false
  TestValidator.predicate(
    "all custom roles have is_builtin=false",
    customRolesResponse.data.every((role) => role.is_builtin === false),
  );
  // Validate pagination for custom roles
  TestValidator.equals(
    "custom roles pagination current",
    customRolesResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "custom roles pagination records matches data length",
    customRolesResponse.pagination.records >= customRolesResponse.data.length,
  );
  // 6. Validate that builtin and custom role sets are mutually exclusive
  const builtinRoleIds = new Set(builtinRolesResponse.data.map((r) => r.id));
  const customRoleIds = new Set(customRolesResponse.data.map((r) => r.id));
  TestValidator.predicate(
    "no overlap between builtin and custom role IDs",
    [...builtinRoleIds].every((id) => !customRoleIds.has(id)),
  );
}
