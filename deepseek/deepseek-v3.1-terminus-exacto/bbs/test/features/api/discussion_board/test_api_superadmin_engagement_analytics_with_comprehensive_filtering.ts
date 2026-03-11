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
 * Test super administrator engagement analytics with comprehensive filtering parameters.
 * Validates platform oversight capabilities including text search, section filtering,
 * and pagination for monitoring content engagement patterns.
 */
export async function test_api_superadmin_engagement_analytics_with_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(authorized);
  // Update connection with authorization token
  superAdminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Test empty search - baseline pagination
  const emptySearch =
    await api.functional.discussionBoard.superAdmin.engagement.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(emptySearch);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    emptySearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    emptySearch.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    emptySearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    emptySearch.pagination.pages >= 0,
  );
  TestValidator.equals(
    "data array length matches pagination",
    true,
    emptySearch.data.length <= emptySearch.pagination.limit,
  );
  // 3. Test with search text parameter
  const searchText = RandomGenerator.substring(
    RandomGenerator.content({ paragraphs: 1 }),
  );
  const searchResult =
    await api.functional.discussionBoard.superAdmin.engagement.index(
      superAdminConnection,
      {
        body: {
          search: searchText,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult);
  // 4. Test with section filtering (UUID format)
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const sectionFilterResult =
    await api.functional.discussionBoard.superAdmin.engagement.index(
      superAdminConnection,
      {
        body: {
          discussion_board_section_id: sectionId,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(sectionFilterResult);
  // Validate that filtered results have correct section IDs if any results exist
  if (sectionFilterResult.data.length > 0) {
    for (const article of sectionFilterResult.data) {
      typia.assert(article);
      TestValidator.equals(
        "article belongs to filtered section",
        article.section.id,
        sectionId,
      );
    }
  }
  // 5. Test pagination parameters
  const page = typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>();
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const paginatedResult =
    await api.functional.discussionBoard.superAdmin.engagement.index(
      superAdminConnection,
      {
        body: {
          page,
          limit,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Validate pagination response
  TestValidator.equals(
    "page number matches request",
    paginatedResult.pagination.current,
    page,
  );
  TestValidator.equals(
    "limit matches request",
    paginatedResult.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "data length respects limit",
    paginatedResult.data.length <= limit,
  );
  // 6. Test combined filtering (search + section + pagination)
  const combinedResult =
    await api.functional.discussionBoard.superAdmin.engagement.index(
      superAdminConnection,
      {
        body: {
          search: searchText,
          discussion_board_section_id: sectionId,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Validate combined filtering
  TestValidator.equals(
    "combined filter has correct page",
    combinedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter has correct limit",
    combinedResult.pagination.limit,
    10,
  );
  // 7. Validate that search works with empty results scenario
  const nonExistentSearch =
    await api.functional.discussionBoard.superAdmin.engagement.index(
      superAdminConnection,
      {
        body: {
          search: RandomGenerator.alphabets(50) + Date.now().toString(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(nonExistentSearch);
  // 8. Validate response structure for each article
  for (const article of emptySearch.data) {
    typia.assert(article);
    TestValidator.predicate("article has title", article.title.length > 0);
    TestValidator.predicate(
      "article has author with display name",
      article.author.display_name.length > 0,
    );
    TestValidator.predicate(
      "article has section with name",
      article.section.name.length > 0,
    );
    TestValidator.predicate(
      "article has comment count",
      article.comments_count >= 0,
    );
    TestValidator.predicate(
      "article has created at timestamp",
      article.created_at.length > 0,
    );
  }
}