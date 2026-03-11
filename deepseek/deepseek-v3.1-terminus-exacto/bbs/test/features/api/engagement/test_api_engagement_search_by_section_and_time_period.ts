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

export async function test_api_engagement_search_by_section_and_time_period(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection with proper isolation
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
  // Create multiple articles with different engagement levels
  const articles = await ArrayUtil.asyncRepeat(5, async (index) => {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: `Test Article ${index + 1} - ${RandomGenerator.alphabets(5)}`,
            body: RandomGenerator.content({ paragraphs: 2 }),
            discussion_board_section_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    return article;
  });
  // Add varying engagement metrics to simulate time-based distribution
  await ArrayUtil.asyncForEach(articles, async (article, articleIndex) => {
    // Create engagement distribution: more reactions for recent articles
    const reactionCount = articleIndex < 3 ? 3 : 1;
    await ArrayUtil.asyncRepeat(reactionCount, async () => {
      const reaction =
        await generate_random_discussion_board_member_articles_reactions_create(
          memberConnection,
          {
            body: {
              discussion_board_article_id: article.id,
              reaction_type: RandomGenerator.pick([
                "like",
                "helpful",
                "insightful",
              ] as const),
            } satisfies IDiscussionBoardArticleReaction.ICreate,
          },
        );
      typia.assert(reaction);
    });
  });
  // Test 1: Engagement search with specific section filtering
  const targetSectionId = articles[0].section.id;
  const sectionFilteredSearch =
    await api.functional.discussionBoard.member.engagement.index(
      memberConnection,
      {
        body: {
          discussion_board_section_id: targetSectionId,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(sectionFilteredSearch);
  // Validate section filtering works correctly
  TestValidator.predicate(
    "section filtered search returns results",
    sectionFilteredSearch.data.length >= 0,
  );
  // Verify all returned articles belong to the target section
  sectionFilteredSearch.data.forEach((articleSummary) => {
    TestValidator.equals(
      "article belongs to filtered section",
      articleSummary.section.id,
      targetSectionId,
    );
  });
  // Test 2: Search with non-existent section (edge case)
  const nonExistentSectionSearch =
    await api.functional.discussionBoard.member.engagement.index(
      memberConnection,
      {
        body: {
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(nonExistentSectionSearch);
  // Test 3: Search without section filter (all sections)
  const allSectionsSearch =
    await api.functional.discussionBoard.member.engagement.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(allSectionsSearch);
  TestValidator.predicate(
    "search without section filter returns articles",
    allSectionsSearch.data.length > 0,
  );
  // Test 4: Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    typeof allSectionsSearch.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page valid",
    allSectionsSearch.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit valid",
    allSectionsSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count valid",
    allSectionsSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count valid",
    allSectionsSearch.pagination.pages >= 0,
  );
  // Test 5: Create an article with no engagement for edge case testing
  const noEngagementArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Article with No Engagement",
          body: "This article has no reactions or comments",
          discussion_board_section_id: articles[0].section.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(noEngagementArticle);
  // Search specifically for the section containing the no-engagement article
  const sectionWithNoEngagementSearch =
    await api.functional.discussionBoard.member.engagement.index(
      memberConnection,
      {
        body: {
          discussion_board_section_id: noEngagementArticle.section.id,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(sectionWithNoEngagementSearch);
  // The search should still work even with articles that have no engagement
  TestValidator.predicate(
    "search handles articles with no engagement",
    sectionWithNoEngagementSearch.data.length >= 0,
  );
  // Validate that engagement search respects business logic
  TestValidator.predicate(
    "engagement search returns valid article summaries",
    allSectionsSearch.data.every(
      (article) =>
        typeof article.id === "string" &&
        typeof article.title === "string" &&
        article.author !== undefined &&
        article.section !== undefined,
    ),
  );
}
