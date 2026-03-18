import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

/**
 * Verify partial name matching filter using case-insensitive ILIKE search.
 *
 * SETUP: Create organization with custom roles having distinct names for search testing.
 *
 * STEPS:
 * 1. Authenticate as member
 * 2. Create organization
 * 3. Create custom role named "Project Manager"
 * 4. Create custom role named "QA Engineer"
 * 5. Create custom role named "Developer Lead"
 * 6. Call target endpoint with name filter: "manage" (lowercase partial match)
 * 7. Verify response contains only roles with "manage" or "Manager" in name
 * 8. Call target endpoint with name filter: "engineer" (case-insensitive)
 * 9. Verify response contains only "QA Engineer" role
 * 10. Call target endpoint with name filter: "lead"
 * 11. Verify response contains only "Developer Lead" role
 * 12. Call target endpoint with name filter: "nonexistent"
 * 13. Verify response returns empty data array with valid pagination (records: 0, pages: 0)
 */
export async function test_api_role_search_name_partial_match(
  connection: api.IConnection,
) {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create custom role "Project Manager"
  const projectManagerRole = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    { body: { name: "Project Manager" } },
  );
  typia.assert(projectManagerRole);
  // 4. Create custom role "QA Engineer"
  const qaEngineerRole = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    { body: { name: "QA Engineer" } },
  );
  typia.assert(qaEngineerRole);
  // 5. Create custom role "Developer Lead"
  const developerLeadRole = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    { body: { name: "Developer Lead" } },
  );
  typia.assert(developerLeadRole);
  // 6. Search with partial name "manage"
  const manageSearchResult: IPageIErpHrmRole.ISummary =
    await api.functional.erpHrm.member.roles.index(memberConnection, {
      body: {
        name: "manage",
        is_builtin: null,
        created_at_from: null,
        created_at_to: null,
        sort: null,
        page: null,
        limit: null,
      } satisfies IErpHrmRole.IRequest,
    });
  typia.assert(manageSearchResult);
  // 7. Verify "manage" search returns roles containing "manage"
  TestValidator.predicate(
    "search 'manage' returns only roles with 'manage' in name",
    manageSearchResult.data.every((role: IErpHrmRole.ISummary) =>
      role.name.toLowerCase().includes("manage"),
    ),
  );
  TestValidator.predicate(
    "search 'manage' includes 'Project Manager' role",
    manageSearchResult.data.some(
      (role: IErpHrmRole.ISummary) => role.id === projectManagerRole.id,
    ),
  );
  // 8. Search with partial name "engineer"
  const engineerSearchResult: IPageIErpHrmRole.ISummary =
    await api.functional.erpHrm.member.roles.index(memberConnection, {
      body: {
        name: "engineer",
        is_builtin: null,
        created_at_from: null,
        created_at_to: null,
        sort: null,
        page: null,
        limit: null,
      } satisfies IErpHrmRole.IRequest,
    });
  typia.assert(engineerSearchResult);
  // 9. Verify "engineer" search returns only "QA Engineer"
  TestValidator.equals(
    "search 'engineer' returns exactly 1 role",
    engineerSearchResult.data.length,
    1,
  );
  TestValidator.predicate(
    "search 'engineer' returns QA Engineer role",
    engineerSearchResult.data.some(
      (role: IErpHrmRole.ISummary) => role.id === qaEngineerRole.id,
    ),
  );
  // 10. Search with partial name "lead"
  const leadSearchResult: IPageIErpHrmRole.ISummary =
    await api.functional.erpHrm.member.roles.index(memberConnection, {
      body: {
        name: "lead",
        is_builtin: null,
        created_at_from: null,
        created_at_to: null,
        sort: null,
        page: null,
        limit: null,
      } satisfies IErpHrmRole.IRequest,
    });
  typia.assert(leadSearchResult);
  // 11. Verify "lead" search returns only "Developer Lead"
  TestValidator.equals(
    "search 'lead' returns exactly 1 role",
    leadSearchResult.data.length,
    1,
  );
  TestValidator.predicate(
    "search 'lead' returns Developer Lead role",
    leadSearchResult.data.some(
      (role: IErpHrmRole.ISummary) => role.id === developerLeadRole.id,
    ),
  );
  // 12. Search with non-existent pattern
  const nonExistentSearchResult: IPageIErpHrmRole.ISummary =
    await api.functional.erpHrm.member.roles.index(memberConnection, {
      body: {
        name: "nonexistent",
        is_builtin: null,
        created_at_from: null,
        created_at_to: null,
        sort: null,
        page: null,
        limit: null,
      } satisfies IErpHrmRole.IRequest,
    });
  typia.assert(nonExistentSearchResult);
  // 13. Verify empty result with proper pagination
  TestValidator.equals(
    "nonexistent search returns empty data array",
    nonExistentSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "nonexistent search returns 0 records",
    nonExistentSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "nonexistent search returns 0 pages",
    nonExistentSearchResult.pagination.pages,
    0,
  );
}
