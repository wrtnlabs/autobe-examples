import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test organization search functionality with name-based filtering for authenticated members.
 *
 * Validates that the organization search endpoint correctly filters organizations by name and description using case-insensitive partial matching. The test verifies that search results are properly paginated and that only organizations belonging to the authenticated member are returned.
 *
 * Special attention is given to ensuring that the search parameter performs partial matching on both organization name and description fields, and that pagination metadata accurately reflects the filtered result count rather than the total organization count.
 *
 * 1. Register and authenticate a new member account.
 * 2. Create a member-specific connection for authenticated requests.
 * 3. Retrieve all organizations to obtain valid search terms.
 * 4. Search organizations with a specific name substring from existing data.
 * 5. Verify all returned organizations match the search criteria in name or description.
 * 6. Validate pagination metadata reflects filtered results.
 * 7. Search with empty query to retrieve all member organizations.
 * 8. Verify filtered results are a subset of all results.
 */
export async function test_api_organization_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Retrieve all organizations to obtain valid search terms
  const allResult =
    await api.functional.hrmTimeTrack.member.organizations.index(
      memberConnection,
      {
        body: {} satisfies IHrmTimeTrackOrganization.IRequest,
      },
    );
  typia.assert(allResult);
  // 3. Validate all organizations response
  TestValidator.equals(
    "unfiltered pagination records matches data length",
    allResult.pagination.records,
    allResult.data.length,
  );
  TestValidator.predicate(
    "unfiltered pagination current page is valid",
    allResult.pagination.current >= 1,
  );
  // 4. If organizations exist, test search functionality
  if (allResult.data.length > 0) {
    // Extract a search term from first organization's name
    const firstOrg = allResult.data[0];
    const searchQuery = firstOrg.name.substring(
      0,
      Math.min(3, firstOrg.name.length),
    );
    // 5. Search with specific name substring
    const searchResult =
      await api.functional.hrmTimeTrack.member.organizations.index(
        memberConnection,
        {
          body: {
            search: searchQuery,
          } satisfies IHrmTimeTrackOrganization.IRequest,
        },
      );
    typia.assert(searchResult);
    // 6. Verify all results match search criteria (case-insensitive partial match)
    allResult.data.forEach((org) => {
      const nameMatch = org.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const descMatch =
        org.description !== null &&
        org.description.toLowerCase().includes(searchQuery.toLowerCase());
      TestValidator.predicate(
        `organization ${org.id} matches search in name or description`,
        nameMatch || descMatch,
      );
    });
    // 7. Validate pagination metadata reflects filtered count
    TestValidator.equals(
      "filtered pagination records matches data length",
      searchResult.pagination.records,
      searchResult.data.length,
    );
    TestValidator.predicate(
      "filtered pagination current page is valid",
      searchResult.pagination.current >= 1,
    );
    // 8. Verify filtered results are subset of all results
    const allOrgIds = new Set(allResult.data.map((org) => org.id));
    searchResult.data.forEach((org) => {
      TestValidator.predicate(
        `filtered organization ${org.id} exists in all results`,
        allOrgIds.has(org.id),
      );
    });
    // 9. Verify at least the first organization is in search results
    TestValidator.predicate(
      "first organization appears in search results",
      searchResult.data.some((org) => org.id === firstOrg.id),
    );
  } else {
    // 10. Handle empty organization list case
    TestValidator.equals(
      "empty organization list has zero records",
      allResult.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty organization list has zero pages",
      allResult.pagination.pages,
      0,
    );
  }
}
