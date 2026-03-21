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
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Test that search and filter parameters work correctly for finding specific roles within an organization.
 *
 * Test Steps:
 * 1. Create authenticated member with organization (creates built-in roles)
 * 2. Create several custom roles with distinct names (e.g., 'Developer', 'Designer', 'Team Lead')
 * 3. Test partial name search: search for 'Manag' and verify only 'Manager' role is returned
 * 4. Test filter by built-in roles: set isBuiltin=true and verify only Owner, Manager, Employee are returned
 * 5. Test filter by custom roles: set isBuiltin=false and verify only custom roles are returned
 * 6. Test combined search and filter: search for 'Dev' with isBuiltin=false and verify 'Developer' role is returned
 * 7. Test case-insensitive search: search for 'owner' (lowercase) and verify 'Owner' role is returned
 */
export async function test_api_role_search_and_filter_combinations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member with organization (creates built-in roles)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create several custom roles with distinct names
  const customRoleNames = ["Developer", "Designer", "Team Lead"];
  const createdRoles: IErpHrmRole[] = [];
  for (const roleName of customRoleNames) {
    const role = await generate_random_erp_hrm_member_roles_create(
      memberConnection,
      {
        body: {
          name: roleName,
          permissions: ["employee:view", "project:view"],
        } satisfies DeepPartial<IErpHrmRole.ICreate>,
      },
    );
    typia.assert(role);
    createdRoles.push(role);
  }
  // 3. Test partial name search: search for 'Manag' and verify 'Manager' role is returned
  const managerSearch = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {
        search: "Manag",
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(managerSearch);
  TestValidator.predicate(
    "Manager found in partial search",
    managerSearch.data.some((r) => r.name === "Manager"),
  );
  TestValidator.predicate(
    "Only Manager matches 'Manag'",
    managerSearch.data.every((r) => r.name.includes("Manag")),
  );
  // 4. Test filter by built-in roles: set isBuiltin=true
  const builtinFilter = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {
        isBuiltin: true,
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(builtinFilter);
  const builtinNames = builtinFilter.data.map((r) => r.name);
  TestValidator.predicate(
    "Owner in built-in roles",
    builtinNames.includes("Owner"),
  );
  TestValidator.predicate(
    "Manager in built-in roles",
    builtinNames.includes("Manager"),
  );
  TestValidator.predicate(
    "Employee in built-in roles",
    builtinNames.includes("Employee"),
  );
  TestValidator.predicate(
    "All results are built-in",
    builtinFilter.data.every((r) => r.isBuiltin === true),
  );
  // 5. Test filter by custom roles: set isBuiltin=false
  const customFilter = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {
        isBuiltin: false,
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(customFilter);
  const customNames = customFilter.data.map((r) => r.name);
  TestValidator.predicate(
    "Developer in custom roles",
    customNames.includes("Developer"),
  );
  TestValidator.predicate(
    "Designer in custom roles",
    customNames.includes("Designer"),
  );
  TestValidator.predicate(
    "Team Lead in custom roles",
    customNames.includes("Team Lead"),
  );
  TestValidator.predicate(
    "All results are custom",
    customFilter.data.every((r) => r.isBuiltin === false),
  );
  // 6. Test combined search and filter: search for 'Dev' with isBuiltin=false
  const combinedSearch = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {
        search: "Dev",
        isBuiltin: false,
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(combinedSearch);
  TestValidator.equals(
    "Combined search returns only Developer",
    combinedSearch.data.length,
    1,
  );
  TestValidator.equals(
    "Combined search returns Developer role",
    combinedSearch.data[0].name,
    "Developer",
  );
  TestValidator.equals(
    "Developer is custom role",
    combinedSearch.data[0].isBuiltin,
    false,
  );
  // 7. Test case-insensitive search: search for 'owner' (lowercase)
  const caseInsensitiveSearch = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {
        search: "owner",
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(caseInsensitiveSearch);
  TestValidator.predicate(
    "Owner found with lowercase search",
    caseInsensitiveSearch.data.some((r) => r.name === "Owner"),
  );
  // 8. Test empty result set when no matches found
  const emptySearch = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {
        search: "NonExistentRoleName12345",
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.equals(
    "Empty result for non-existent search",
    emptySearch.data.length,
    0,
  );
  // 9. Test pagination with filters
  const paginatedFilter = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {
        isBuiltin: true,
        page: 1,
        limit: 2,
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(paginatedFilter);
  TestValidator.predicate(
    "Pagination with filter returns data",
    paginatedFilter.data.length <= 2,
  );
  TestValidator.predicate(
    "All paginated results are built-in",
    paginatedFilter.data.every((r) => r.isBuiltin === true),
  );
}
