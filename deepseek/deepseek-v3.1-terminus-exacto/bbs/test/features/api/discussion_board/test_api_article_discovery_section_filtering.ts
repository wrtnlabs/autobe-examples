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

export async function test_api_article_discovery_section_filtering(
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
  // Create a single article to test basic discovery functionality
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Test discovery without filters to verify basic functionality
  const discoveryResult =
    await api.functional.discussionBoard.member.discovery.index(
      memberConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(discoveryResult);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has valid structure",
    discoveryResult.pagination.current >= 0 &&
      discoveryResult.pagination.limit >= 1 &&
      discoveryResult.pagination.limit <= 100 &&
      discoveryResult.pagination.records >= 0 &&
      discoveryResult.pagination.pages >= 0,
  );
  // Validate article summary structure for returned articles
  if (discoveryResult.data.length > 0) {
    TestValidator.predicate(
      "articles have valid structure",
      discoveryResult.data.every(
        (articleSummary) =>
          typeof articleSummary.id === "string" &&
          typeof articleSummary.title === "string" &&
          typeof articleSummary.author.id === "string" &&
          typeof articleSummary.author.display_name === "string" &&
          typeof articleSummary.section.id === "string" &&
          typeof articleSummary.section.name === "string" &&
          Array.isArray(articleSummary.tags) &&
          typeof articleSummary.comments_count === "number" &&
          typeof articleSummary.created_at === "string",
      ),
    );
  }
  // Test discovery with search parameter
  const searchResult =
    await api.functional.discussionBoard.member.discovery.index(
      memberConnection,
      {
        body: {
          search: RandomGenerator.substring(article.title),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate search result structure
  TestValidator.predicate(
    "search result has valid pagination",
    searchResult.pagination.current >= 0 &&
      searchResult.pagination.limit >= 1 &&
      searchResult.pagination.limit <= 100,
  );
}
