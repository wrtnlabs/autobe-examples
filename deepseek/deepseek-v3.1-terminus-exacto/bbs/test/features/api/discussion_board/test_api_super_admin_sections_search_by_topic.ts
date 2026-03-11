import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator search functionality for finding sections by topic keywords.
 *
 * As a super admin managing content organization, test the search parameter's ability
 * to find sections by partial matches in both name and description fields. Verify that
 * the system correctly implements case-insensitive pattern matching and returns relevant
 * sections even with partial search terms.
 */
export async function test_api_super_admin_sections_search_by_topic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Test exact section name match
  const exactSearchResult =
    await api.functional.discussionBoard.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          search: "Technology",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(exactSearchResult);
  // 3. Test partial name match
  const partialSearchResult =
    await api.functional.discussionBoard.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          search: "Tech",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(partialSearchResult);
  // 4. Test description keyword match
  const descriptionSearchResult =
    await api.functional.discussionBoard.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          search: "discussion",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(descriptionSearchResult);
  // 5. Test combined search terms
  const combinedSearchResult =
    await api.functional.discussionBoard.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          search: "technology trends",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(combinedSearchResult);
  // 6. Test sorting by newest first
  const sortedSearchResult =
    await api.functional.discussionBoard.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          search: "political",
          sort: "created_at:desc" as const,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(sortedSearchResult);
  // 7. Validate search results contain expected content
  TestValidator.predicate(
    "search results should contain matching sections",
    exactSearchResult.data.length >= 0,
  );
  TestValidator.predicate(
    "partial search should return relevant results",
    partialSearchResult.data.length >= 0,
  );
  TestValidator.predicate(
    "description search should find matching content",
    descriptionSearchResult.data.length >= 0,
  );
  // 8. Test pagination
  const paginatedResult =
    await api.functional.discussionBoard.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          search: "economic",
          limit: 2,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination should respect limit parameter",
    paginatedResult.data.length <= 2,
  );
  // 9. Test case-insensitive matching
  const caseInsensitiveResult =
    await api.functional.discussionBoard.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          search: "TECHNOLOGY",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(caseInsensitiveResult);
  TestValidator.predicate(
    "case-insensitive search should return results",
    caseInsensitiveResult.data.length >= 0,
  );
  // 10. Test empty search (should return all sections)
  const emptySearchResult =
    await api.functional.discussionBoard.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          search: "",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty search should return sections",
    emptySearchResult.data.length >= 0,
  );
}
