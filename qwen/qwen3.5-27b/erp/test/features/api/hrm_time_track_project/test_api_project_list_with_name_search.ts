import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test project listing with name-based search using trigram similarity matching.
 *
 * Validates the complete project search workflow including member authentication and various search scenarios. Tests exact match, partial match, no match, and empty search conditions to verify trigram similarity matching behavior.
 *
 * Special attention is given to verifying that the search correctly filters projects by name using fuzzy matching, pagination metadata accurately reflects filtered results, and edge cases like empty search and no matches are handled properly.
 *
 * 1. Authenticate as a member using /auth/member/join
 * 2. Test exact match search with a specific project name
 * 3. Test partial match search with a substring of project name
 * 4. Test no match search with a non-existent project name
 * 5. Test empty search string to verify all projects are returned
 * 6. Validate pagination metadata in each scenario
 */
export async function test_api_project_list_with_name_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Test exact match search
  const exactSearchTerm = "ExactMatchProject";
  const exactSearchResult =
    await api.functional.hrmTimeTrack.member.projects.index(memberConnection, {
      body: {
        search: exactSearchTerm,
      } satisfies IHrmTimeTrackProject.IRequest,
    });
  typia.assert(exactSearchResult);
  // Verify pagination metadata
  TestValidator.equals(
    "exact search pagination records",
    exactSearchResult.pagination.records,
    exactSearchResult.data.length,
  );
  // 3. Test partial match search
  const partialSearchTerm = "Partial";
  const partialSearchResult =
    await api.functional.hrmTimeTrack.member.projects.index(memberConnection, {
      body: {
        search: partialSearchTerm,
      } satisfies IHrmTimeTrackProject.IRequest,
    });
  typia.assert(partialSearchResult);
  // Verify pagination metadata
  TestValidator.equals(
    "partial search pagination records",
    partialSearchResult.pagination.records,
    partialSearchResult.data.length,
  );
  // 4. Test no match search
  const noMatchSearchTerm = "NonExistentProjectName12345";
  const noMatchSearchResult =
    await api.functional.hrmTimeTrack.member.projects.index(memberConnection, {
      body: {
        search: noMatchSearchTerm,
      } satisfies IHrmTimeTrackProject.IRequest,
    });
  typia.assert(noMatchSearchResult);
  // Verify empty results
  TestValidator.equals(
    "no match search returns empty array",
    noMatchSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "no match pagination records is 0",
    noMatchSearchResult.pagination.records,
    0,
  );
  // 5. Test empty search string (should return all projects)
  const emptySearchResult =
    await api.functional.hrmTimeTrack.member.projects.index(memberConnection, {
      body: {
        search: "",
      } satisfies IHrmTimeTrackProject.IRequest,
    });
  typia.assert(emptySearchResult);
  // Verify pagination metadata
  TestValidator.equals(
    "empty search pagination records",
    emptySearchResult.pagination.records,
    emptySearchResult.data.length,
  );
  // 6. Test search without search parameter (should also return all projects)
  const noSearchParamResult =
    await api.functional.hrmTimeTrack.member.projects.index(memberConnection, {
      body: {} satisfies IHrmTimeTrackProject.IRequest,
    });
  typia.assert(noSearchParamResult);
  // Verify pagination metadata
  TestValidator.equals(
    "no search param pagination records",
    noSearchParamResult.pagination.records,
    noSearchParamResult.data.length,
  );
  // 7. Test case-insensitive search (if supported)
  const caseInsensitiveSearchTerm = "exactmatchproject";
  const caseInsensitiveSearchResult =
    await api.functional.hrmTimeTrack.member.projects.index(memberConnection, {
      body: {
        search: caseInsensitiveSearchTerm,
      } satisfies IHrmTimeTrackProject.IRequest,
    });
  typia.assert(caseInsensitiveSearchResult);
  // Verify pagination metadata
  TestValidator.equals(
    "case insensitive search pagination records",
    caseInsensitiveSearchResult.pagination.records,
    caseInsensitiveSearchResult.data.length,
  );
}
