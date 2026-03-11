import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator cross-section search with comprehensive filtering capabilities.
 * 1. Authenticate as super administrator using join endpoint
 * 2. Perform cross-section search with text query and optional section filtering
 * 3. Validate paginated response structure and content
 * 4. Verify search results match filtering criteria
 */
export async function test_api_cross_section_search_with_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Perform cross-section search with filtering
  const searchRequest: IDiscussionBoardArticle.IRequest = {
    search: RandomGenerator.substring(
      RandomGenerator.content({ paragraphs: 1 }),
    ),
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  };
  const searchResults =
    await api.functional.discussionBoard.superAdmin.cross_section.index(
      superAdminConnection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResults);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "current page positive",
    searchResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit within bounds",
    searchResults.pagination.limit >= 1 &&
      searchResults.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count non-negative",
    searchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    searchResults.pagination.pages >= 0,
  );
  // 4. Validate article summary structure for each result
  for (const article of searchResults.data) {
    typia.assert(article);
    // Business logic validation - ensure essential properties exist
    TestValidator.predicate(
      "article has title",
      article.title !== undefined && article.title !== null,
    );
    TestValidator.predicate(
      "article has author",
      article.author !== undefined && article.author !== null,
    );
    TestValidator.predicate(
      "article has section",
      article.section !== undefined && article.section !== null,
    );
    TestValidator.predicate(
      "article has valid comments count",
      article.comments_count >= 0,
    );
  }
  // 5. Test with section filtering
  const sectionFilterRequest: IDiscussionBoardArticle.IRequest = {
    discussion_board_section_id: typia.random<string & tags.Format<"uuid">>(),
    search: RandomGenerator.substring(
      RandomGenerator.content({ paragraphs: 1 }),
    ),
    page: 1,
    limit: 10,
  };
  const filteredResults =
    await api.functional.discussionBoard.superAdmin.cross_section.index(
      superAdminConnection,
      {
        body: sectionFilterRequest,
      },
    );
  typia.assert(filteredResults);
  // 6. Validate filtered results structure
  TestValidator.equals(
    "filtered page limit",
    filteredResults.pagination.limit,
    10,
  );
  TestValidator.equals(
    "filtered current page",
    filteredResults.pagination.current,
    1,
  );
}
