import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test edge cases where engagement metrics filtering returns empty or limited results.
 * Create articles with minimal engagement (few reactions, no comments, low views)
 * and test filtering with high engagement thresholds that should exclude most articles.
 * Verify that the system correctly handles scenarios where no articles match the
 * engagement criteria, returning appropriate empty pagination results.
 */
export async function test_api_admin_engagement_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Create multiple articles with minimal engagement
  const articles: IDiscussionBoardArticle[] = [];
  for (let i = 0; i < 3; i++) {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            body: RandomGenerator.content({ paragraphs: 2 }),
            discussion_board_section_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    articles.push(article);
  }
  // Test 1: Filter with non-existent search term
  const emptySearchResult =
    await api.functional.discussionBoard.admin.engagement.index(
      adminConnection,
      {
        body: {
          search: "nonexistenttermthatshouldnotmatchanything",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search result data",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search result records",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search result pages",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search result current page",
    emptySearchResult.pagination.current,
    0,
  );
  // Test 2: Filter with non-existent section ID
  const emptySectionResult =
    await api.functional.discussionBoard.admin.engagement.index(
      adminConnection,
      {
        body: {
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(emptySectionResult);
  TestValidator.equals(
    "empty section result data",
    emptySectionResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty section result records",
    emptySectionResult.pagination.records,
    0,
  );
  // Test 3: Filter with high pagination limits on empty results
  const highLimitEmptyResult =
    await api.functional.discussionBoard.admin.engagement.index(
      adminConnection,
      {
        body: {
          search: "nonexistent",
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(highLimitEmptyResult);
  TestValidator.equals(
    "high limit empty result data",
    highLimitEmptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "high limit empty result limit",
    highLimitEmptyResult.pagination.limit,
    50,
  );
  TestValidator.equals(
    "high limit empty result records",
    highLimitEmptyResult.pagination.records,
    0,
  );
  // Test 4: Filter with out-of-bounds page number
  const outOfBoundsResult =
    await api.functional.discussionBoard.admin.engagement.index(
      adminConnection,
      {
        body: {
          search: "nonexistent",
          page: 999,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(outOfBoundsResult);
  TestValidator.equals(
    "out of bounds result data",
    outOfBoundsResult.data.length,
    0,
  );
  TestValidator.predicate(
    "out of bounds page should be adjusted",
    outOfBoundsResult.pagination.current <= outOfBoundsResult.pagination.pages,
  );
}
