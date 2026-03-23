import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering roles by built-in status and searching by name.
 * Validates is_builtin filter (true/false), case-insensitive search,
 * and combined filter functionality on the role list endpoint.
 */
export async function test_api_role_list_filter_by_builtin_status_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test filter by built-in roles (is_builtin=true)
  const builtinRolesResponse =
    await api.functional.hrmPlatform.admin.roles.index(adminConnection, {
      body: {
        is_builtin: true,
      } satisfies IHrmPlatformRole.IRequest,
    });
  typia.assert(builtinRolesResponse);
  TestValidator.predicate(
    "builtin filter returns only built-in roles",
    builtinRolesResponse.data.every((role) => role.is_builtin === true),
  );
  TestValidator.predicate(
    "builtin roles have built_in_type set",
    builtinRolesResponse.data.every(
      (role) => role.built_in_type !== null && role.built_in_type !== undefined,
    ),
  );
  TestValidator.equals(
    "builtin roles count matches pagination",
    builtinRolesResponse.data.length,
    builtinRolesResponse.pagination.records,
  );
  // 3. Test filter by custom roles (is_builtin=false)
  const customRolesResponse =
    await api.functional.hrmPlatform.admin.roles.index(adminConnection, {
      body: {
        is_builtin: false,
      } satisfies IHrmPlatformRole.IRequest,
    });
  typia.assert(customRolesResponse);
  TestValidator.predicate(
    "custom filter returns only custom roles",
    customRolesResponse.data.every((role) => role.is_builtin === false),
  );
  TestValidator.predicate(
    "custom roles have built_in_type null",
    customRolesResponse.data.every((role) => role.built_in_type === null),
  );
  TestValidator.equals(
    "custom roles count matches pagination",
    customRolesResponse.data.length,
    customRolesResponse.pagination.records,
  );
  // 4. Test search by name (case-insensitive)
  const searchLowerResponse =
    await api.functional.hrmPlatform.admin.roles.index(adminConnection, {
      body: {
        search: "manager",
      } satisfies IHrmPlatformRole.IRequest,
    });
  typia.assert(searchLowerResponse);
  TestValidator.predicate(
    "search returns roles with matching name",
    searchLowerResponse.data.every((role) =>
      role.name.toLowerCase().includes("manager"),
    ),
  );
  const searchUpperResponse =
    await api.functional.hrmPlatform.admin.roles.index(adminConnection, {
      body: {
        search: "MANAGER",
      } satisfies IHrmPlatformRole.IRequest,
    });
  typia.assert(searchUpperResponse);
  TestValidator.equals(
    "search is case-insensitive",
    searchLowerResponse.data.map((r) => r.id).sort(),
    searchUpperResponse.data.map((r) => r.id).sort(),
  );
  // 5. Test combined filters (is_builtin=false AND search)
  const combinedFilterResponse =
    await api.functional.hrmPlatform.admin.roles.index(adminConnection, {
      body: {
        is_builtin: false,
        search: "custom",
      } satisfies IHrmPlatformRole.IRequest,
    });
  typia.assert(combinedFilterResponse);
  TestValidator.predicate(
    "combined filter returns only custom roles",
    combinedFilterResponse.data.every((role) => role.is_builtin === false),
  );
  TestValidator.predicate(
    "combined filter returns only roles matching search",
    combinedFilterResponse.data.every((role) =>
      role.name.toLowerCase().includes("custom"),
    ),
  );
  TestValidator.equals(
    "combined filter count matches pagination",
    combinedFilterResponse.data.length,
    combinedFilterResponse.pagination.records,
  );
  // 6. Test no filters (should return all roles)
  const allRolesResponse = await api.functional.hrmPlatform.admin.roles.index(
    adminConnection,
    {
      body: {} satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(allRolesResponse);
  TestValidator.predicate(
    "no filter returns both builtin and custom roles",
    (allRolesResponse.data.some((role) => role.is_builtin === true) &&
      allRolesResponse.data.some((role) => role.is_builtin === false)) ||
      allRolesResponse.data.length === 0,
  );
  TestValidator.equals(
    "all roles count matches pagination",
    allRolesResponse.data.length,
    allRolesResponse.pagination.records,
  );
}
