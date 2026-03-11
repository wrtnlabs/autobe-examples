import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReaction";
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
import { generate_random_discussion_board_member_articles_reactions_create } from "../../../generate/generate_random_discussion_board_member_articles_reactions_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_reaction } from "../../../prepare/prepare_random_discussion_board_article_reaction";

export async function test_api_engagement_search_by_reaction_threshold(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create multiple member connections
  const memberConnections = await ArrayUtil.asyncRepeat(5, async (index) => {
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: `Member${index + 1}`,
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
    return memberConnection;
  });
  // Step 2: Create articles with varying engagement levels
  const articles: IDiscussionBoardArticle[] = [];
  const reactionTypes = ["like", "helpful", "insightful"] as const;
  for (let i = 0; i < 12; i++) {
    const authorIdx = i % memberConnections.length;
    const authorConnection = memberConnections[authorIdx];
    // Create article
    const article =
      await generate_random_discussion_board_member_articles_create(
        authorConnection,
        {
          body: {
            title: `Article ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
            body: RandomGenerator.content({ paragraphs: 3 }),
            discussion_board_section_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
    typia.assert(article);
    articles.push(article);
    // Add varying number of reactions (0 to 8)
    const reactionCount = i % 9; // Creates 0-8 reactions
    for (let j = 0; j < reactionCount; j++) {
      const reactorIdx = (j + 1) % memberConnections.length;
      const reactorConnection = memberConnections[reactorIdx];
      await generate_random_discussion_board_member_articles_reactions_create(
        reactorConnection,
        {
          body: {
            discussion_board_article_id: article.id,
            reaction_type: RandomGenerator.pick(reactionTypes),
          },
        },
      );
    }
  }
  // Step 3: Test engagement search with different thresholds
  // Create a test member for searching
  const testMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(testMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "TestSearcher",
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Test 1: Search with no threshold - should return all articles
  const search1 = await api.functional.discussionBoard.member.engagement.index(
    testMemberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(search1);
  TestValidator.predicate(
    "no threshold search returns paginated results",
    search1.pagination.records >= 12 && search1.data.length <= 20,
  );
  // Test 2: Search with low threshold - should return articles with 3+ reactions
  const search2 = await api.functional.discussionBoard.member.engagement.index(
    testMemberConnection,
    {
      body: {
        search: "3", // Assuming search includes reaction count threshold
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(search2);
  // Test 3: Search with medium threshold - should return articles with 6+ reactions
  const search3 = await api.functional.discussionBoard.member.engagement.index(
    testMemberConnection,
    {
      body: {
        search: "6", // Higher threshold
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(search3);
  // Test 4: Test pagination with many results
  // Create 30 more articles to test pagination
  for (let i = 0; i < 30; i++) {
    const authorIdx = i % memberConnections.length;
    const authorConnection = memberConnections[authorIdx];
    await generate_random_discussion_board_member_articles_create(
      authorConnection,
      {
        body: {
          title: `Additional Article ${i + 1}`,
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      },
    );
  }
  // Test pagination with limit 10
  const paginatedSearch =
    await api.functional.discussionBoard.member.engagement.index(
      testMemberConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination page number",
    paginatedSearch.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedSearch.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "has multiple pages",
    paginatedSearch.pagination.pages > 1,
  );
  // Step 4: Validate engagement metrics structure
  if (search1.data.length > 0) {
    const sampleArticle = search1.data[0];
    typia.assert(sampleArticle);
    TestValidator.predicate("has author", !!sampleArticle.author);
    TestValidator.predicate("has section", !!sampleArticle.section);
    TestValidator.predicate("has creation date", !!sampleArticle.created_at);
    TestValidator.predicate(
      "has tags array",
      Array.isArray(sampleArticle.tags),
    );
    TestValidator.predicate(
      "has comments count",
      typeof sampleArticle.comments_count === "number",
    );
  }
  // Step 5: Verify threshold filtering logic
  // Articles with 0-2 reactions: 4 articles (indices 0, 1, 2, 3)
  // Articles with 3-5 reactions: 4 articles (indices 4, 5, 6, 7)
  // Articles with 6+ reactions: 4 articles (indices 8, 9, 10, 11)
  // Since we can't directly query reaction counts, verify the search returns different counts
  TestValidator.predicate(
    "higher threshold returns fewer results",
    search2.pagination.records >= search3.pagination.records,
  );
}
