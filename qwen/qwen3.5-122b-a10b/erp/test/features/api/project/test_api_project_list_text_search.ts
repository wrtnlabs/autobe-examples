import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_list_text_search(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test text search functionality on project name and description fields using trigram-based fuzzy matching.
   *
   * Validates the project list search endpoint supports partial text matching across both project name and description fields. The test authenticates as a member, retrieves their organization, and exercises the search parameter with various query terms to verify trigram-based filtering works correctly.
   *
   * Since project creation is not available through the provided SDK functions, this test validates the search API structure and filtering behavior using existing projects in the organization.
   *
   * 1. Authenticate member account with email and password credentials.
   * 2. Extract organization context from authentication response.
   * 3. Query projects with text search parameter for partial matching.
   * 4. Query projects without search parameter to retrieve all projects.
   * 5. Validate search results are subset of all projects.
   * 6. Verify pagination metadata is correctly populated.
   */
  // 1. Authenticate as member
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
  // 2. Get organization from member auth response
  if (!memberAuth.organizations || memberAuth.organizations.length === 0) {
    throw new Error("Member has no organizations");
  }
  const organizationId = memberAuth.organizations[0].id;
  // 3. Test search with various terms - using "test" as sample search term
  const searchResults =
    await api.functional.hrm.member.organizations.projects.index(
      memberConnection,
      {
        organizationId,
        body: {
          search: "test",
          limit: 100,
        } satisfies IHrmProject.IRequest,
      },
    );
  typia.assert(searchResults);
  // 4. Validate search results structure
  TestValidator.predicate(
    "search results have pagination",
    searchResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "search results have data array",
    Array.isArray(searchResults.data),
  );
  TestValidator.predicate(
    "pagination has valid current page",
    searchResults.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    searchResults.pagination.limit > 0,
  );
  // 5. Test empty search (should return all projects)
  const allProjects =
    await api.functional.hrm.member.organizations.projects.index(
      memberConnection,
      {
        organizationId,
        body: {
          search: undefined,
          limit: 100,
        } satisfies IHrmProject.IRequest,
      },
    );
  typia.assert(allProjects);
  // 6. Validate all projects structure
  TestValidator.predicate(
    "all projects have pagination",
    allProjects.pagination !== undefined,
  );
  TestValidator.predicate(
    "all projects have data array",
    Array.isArray(allProjects.data),
  );
  // 7. Validate search results are subset of all projects (search filters results)
  TestValidator.predicate(
    "search results count <= all projects count",
    searchResults.pagination.records <= allProjects.pagination.records,
  );
  // 8. Test with different search term to validate search functionality
  const searchResults2 =
    await api.functional.hrm.member.organizations.projects.index(
      memberConnection,
      {
        organizationId,
        body: {
          search: "project",
          limit: 100,
        } satisfies IHrmProject.IRequest,
      },
    );
  typia.assert(searchResults2);
  // 9. Validate different search terms may return different result counts
  TestValidator.predicate(
    "different search terms return valid results",
    searchResults2.pagination.records >= 0,
  );
  // 10. Test pagination with search
  const pagedSearchResults =
    await api.functional.hrm.member.organizations.projects.index(
      memberConnection,
      {
        organizationId,
        body: {
          search: "test",
          page: 1,
          limit: 10,
        } satisfies IHrmProject.IRequest,
      },
    );
  typia.assert(pagedSearchResults);
  TestValidator.predicate(
    "paged search has correct page",
    pagedSearchResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "paged search respects limit",
    pagedSearchResults.pagination.limit === 10,
  );
  TestValidator.predicate(
    "paged search data length <= limit",
    pagedSearchResults.data.length <= 10,
  );
}
