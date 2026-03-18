import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_role_search_paginated_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization to establish context (creates built-in roles: Owner, Manager, Employee)
  await generate_random_erp_hrm_member_organizations_create(
    memberConnection,
    {},
  );
  // 3. Search roles with default pagination (all null for default behavior)
  const result = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {
        name: null,
        is_builtin: null,
        created_at_from: null,
        created_at_to: null,
        sort: null,
        page: null,
        limit: null,
      } satisfies IErpHrmRole.IRequest,
    },
  );
  // 4. Validate response structure with typia (validates all types and required fields)
  typia.assert(result);
  // 5. Verify default pagination values
  TestValidator.equals("pagination current is 1", result.pagination.current, 1);
  TestValidator.equals("pagination limit is 20", result.pagination.limit, 20);
  // 6. Verify at least 3 roles exist (the 3 built-in roles)
  TestValidator.predicate("at least 3 roles returned", result.data.length >= 3);
  // 7. Verify all 3 built-in roles are present (Owner, Manager, Employee)
  const builtinRoleNames = ["Owner", "Manager", "Employee"];
  const foundBuiltinRoles = result.data.filter((role) => role.is_builtin);
  const foundBuiltinNames = foundBuiltinRoles.map((role) => role.name);
  TestValidator.predicate(
    "has all 3 built-in roles",
    builtinRoleNames.every((name) => foundBuiltinNames.includes(name)),
  );
  TestValidator.equals("exactly 3 built-in roles", foundBuiltinRoles.length, 3);
  // 8. Verify permissions_count is populated for all roles (computed field validation)
  TestValidator.predicate(
    "all permissions_count values are non-negative",
    result.data.every((role) => role.permissions_count >= 0),
  );
  // 9. Verify records count matches data array length
  TestValidator.equals(
    "records count matches data length",
    result.pagination.records,
    result.data.length,
  );
}
