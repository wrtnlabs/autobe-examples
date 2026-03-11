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

export async function test_api_member_search_tag_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
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
  typia.assert(member);
  // Create articles with specific content for search testing
  const searchTerm = "technology" + RandomGenerator.alphabets(5);
  // Create articles with different content patterns
  const article1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: `${searchTerm} article about programming`,
          body: "This article discusses programming languages and software development",
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article1);
  const article2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Another article about " + searchTerm,
          body: "Content discussing " + searchTerm + " and related topics",
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article2);
  const article3 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Unrelated article",
          body: "This article has no relation to the search term",
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article3);
  // Test 1: Basic text search
  const searchResults1 =
    await api.functional.discussionBoard.member.search.index(memberConnection, {
      body: {
        search: searchTerm,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResults1);
  TestValidator.predicate(
    "text search returns matching articles",
    searchResults1.data.length >= 2,
  );
  // Test 2: Search with non-matching term
  const searchResults2 =
    await api.functional.discussionBoard.member.search.index(memberConnection, {
      body: {
        search: "nonexistentsearchterm" + RandomGenerator.alphabets(10),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResults2);
  TestValidator.equals(
    "non-matching search returns empty",
    searchResults2.data.length,
    0,
  );
  // Test 3: Search without search term (should return all articles)
  const searchResults3 =
    await api.functional.discussionBoard.member.search.index(memberConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResults3);
  TestValidator.predicate(
    "search without term returns articles",
    searchResults3.data.length >= 3,
  );
  // Test 4: Pagination validation
  const searchResults4 =
    await api.functional.discussionBoard.member.search.index(memberConnection, {
      body: {
        search: searchTerm,
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResults4);
  TestValidator.equals("pagination limit works", searchResults4.data.length, 1);
  TestValidator.predicate(
    "pagination metadata is correct",
    searchResults4.pagination.records >= 2 &&
      searchResults4.pagination.limit === 1,
  );
}
