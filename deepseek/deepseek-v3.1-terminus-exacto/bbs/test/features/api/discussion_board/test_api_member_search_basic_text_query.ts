import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_member_search_basic_text_query(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate as member
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
  typia.assert(member);
  // Create multiple test articles with varied content
  const articles: IDiscussionBoardArticle[] = [];
  // Create articles with different content topics
  const articleContents = [
    "Artificial intelligence is transforming modern technology",
    "Climate change impacts global weather patterns significantly",
    "Renewable energy sources are becoming more affordable",
    "Space exploration continues to advance scientific knowledge",
    "Digital transformation affects business operations worldwide",
  ];
  // We need a valid section ID - create one or use existing
  // For now, we'll create articles without specifying section (if allowed)
  // or use a placeholder approach
  for (const content of articleContents) {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            body: content,
            discussion_board_section_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    articles.push(article);
  }
  // Test basic text search with partial matching
  const searchQuery1 = "artificial intelligence";
  const searchResult1 =
    await api.functional.discussionBoard.member.search.index(memberConnection, {
      body: {
        search: searchQuery1,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult1);
  // Validate pagination structure
  TestValidator.predicate(
    "current page is 1",
    searchResult1.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is valid",
    searchResult1.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records count is non-negative",
    searchResult1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    searchResult1.pagination.pages >= 0,
  );
  // Test partial text matching with shorter query
  const searchQuery2 = "climate";
  const searchResult2 =
    await api.functional.discussionBoard.member.search.index(memberConnection, {
      body: {
        search: searchQuery2,
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult2);
  // Test single word search
  const searchQuery3 = "energy";
  const searchResult3 =
    await api.functional.discussionBoard.member.search.index(memberConnection, {
      body: {
        search: searchQuery3,
        page: 1,
        limit: 3,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult3);
  // Test search with no results expected
  const searchQuery4 = "nonexistentterm12345";
  const searchResult4 =
    await api.functional.discussionBoard.member.search.index(memberConnection, {
      body: {
        search: searchQuery4,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult4);
  // Verify search functionality works
  TestValidator.predicate(
    "search returns reasonable number of results",
    searchResult1.data.length >= 0 &&
      searchResult1.data.length <= searchResult1.pagination.limit,
  );
  // Test pagination by requesting different pages
  const searchResultPage2 =
    await api.functional.discussionBoard.member.search.index(memberConnection, {
      body: {
        search: "technology",
        page: 2,
        limit: 2,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResultPage2);
}
