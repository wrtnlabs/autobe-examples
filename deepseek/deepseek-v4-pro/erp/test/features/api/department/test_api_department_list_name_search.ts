import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_departments_create } from "../../../generate/generate_random_erp_hrm_member_departments_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";

/**
 * Test department listing fuzzy text search by department name.
 *
 * Validates that the department listing endpoint supports trigram fuzzy matching on department names using the `search` parameter. Verifies that partial search terms correctly match departments whose names contain the search substring, while excluding departments with no match.
 *
 * 1. A member joins and authenticates to establish organization context.
 * 2. Three departments are created with distinct names: "Software Engineering", "Design Engineering", and "Human Resources".
 * 3. Searching with "eng" returns both engineering departments but excludes Human Resources, confirming trigram fuzzy matching.
 * 4. Searching with "zzznotfound" returns an empty result set with pagination metadata showing zero records and zero pages.
 */
export async function test_api_department_list_name_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member and establish organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, { body: {} });
  typia.assert(member);
  // 2. Create three departments with distinct names
  const softwareEngineering =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: { name: "Software Engineering" },
    });
  typia.assert(softwareEngineering);
  const designEngineering =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: { name: "Design Engineering" },
    });
  typia.assert(designEngineering);
  const humanResources =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: { name: "Human Resources" },
    });
  typia.assert(humanResources);
  // 3. Search with "eng" — trigram fuzzy match
  const searchResult = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    {
      body: { search: "eng" } satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(searchResult);
  const matchingNames = searchResult.data.map((d) => d.name);
  TestValidator.predicate("Software Engineering found", () =>
    matchingNames.includes("Software Engineering"),
  );
  TestValidator.predicate("Design Engineering found", () =>
    matchingNames.includes("Design Engineering"),
  );
  TestValidator.predicate(
    "Human Resources excluded",
    () => !matchingNames.includes("Human Resources"),
  );
  // 4. Search with "zzznotfound" — empty result set
  const emptyResult = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    {
      body: { search: "zzznotfound" } satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals("empty data array", emptyResult.data.length, 0);
  TestValidator.equals("zero records", emptyResult.pagination.records, 0);
  TestValidator.equals("zero pages", emptyResult.pagination.pages, 0);
}
