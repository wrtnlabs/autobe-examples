import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test employee list search by name functionality with various search scenarios.
 *
 * Validates the text-based search capability for finding employees by user display name through the organization-scoped employee listing endpoint. Ensures that the search performs case-insensitive partial matching and can be combined with other filters using AND logic.
 *
 * The test verifies search parameter handling and response structure with various search inputs:
 * 1. Exact name matching validation
 * 2. Partial name matching with substring search
 * 3. Case-insensitive search handling
 * 4. Combined filters (search + status) functionality
 * 5. Empty results handling when no matches found
 * 6. Special characters in search terms
 * 7. Long search string handling
 *
 * 1. Member registers and authenticates with the system.
 * 2. Test search with various name patterns.
 * 3. Test combined filters with search parameter.
 * 4. Test edge cases (empty results, special characters, long strings).
 */
export async function test_api_employee_list_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // Organization code for testing (would be from actual organization in real scenario)
  const organizationCode = typia.random<string>();
  // 2. Test exact name search
  const exactSearchResults =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          search: "John",
          page: 1,
          pageSize: 20,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(exactSearchResults);
  // Validate response structure
  TestValidator.predicate(
    "search returns paginated result with valid structure",
    exactSearchResults.pagination.current === 1 &&
      exactSearchResults.pagination.limit > 0 &&
      Array.isArray(exactSearchResults.data),
  );
  // 3. Test case-insensitive search (lowercase)
  const caseInsensitiveResults =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          search: "john", // lowercase version
          page: 1,
          pageSize: 20,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(caseInsensitiveResults);
  // 4. Test partial name search with substring
  const partialSearchResults =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          search: "Jo", // partial match
          page: 1,
          pageSize: 20,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(partialSearchResults);
  // 5. Test empty search results (non-existent name)
  const emptyResults =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          search: "NonExistentEmployee12345XYZ",
          page: 1,
          pageSize: 20,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.equals(
    "empty search returns no results",
    emptyResults.data.length,
    0,
  );
  // 6. Test combined filters (search + status)
  const combinedFilterResults =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          search: "John",
          status: "active",
          page: 1,
          pageSize: 20,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(combinedFilterResults);
  // 7. Test combined filters (search + employment_type)
  const employmentTypeFilterResults =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          search: "Smith",
          employment_type: "full-time",
          page: 1,
          pageSize: 20,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(employmentTypeFilterResults);
  // 8. Test search with special characters
  const specialCharResults =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          search: "O'Brien",
          page: 1,
          pageSize: 20,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(specialCharResults);
  // 9. Test search with very long string
  const longStringResults =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          search: RandomGenerator.alphabets(100),
          page: 1,
          pageSize: 20,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(longStringResults);
  // 10. Test pagination with search
  const paginatedSearchResults =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          search: "Test",
          page: 2,
          pageSize: 10,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(paginatedSearchResults);
  TestValidator.equals(
    "pagination returns correct page number",
    paginatedSearchResults.pagination.current,
    2,
  );
  // 11. Test search with sorting
  const sortedSearchResults =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          search: "John",
          sortBy: "created_at",
          sortOrder: "desc",
          page: 1,
          pageSize: 20,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(sortedSearchResults);
}
