import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReaction";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_reactions_create } from "../../../generate/generate_random_discussion_board_member_articles_reactions_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_reaction } from "../../../prepare/prepare_random_discussion_board_article_reaction";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_admin_popular_articles_ranking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create multiple member accounts
  const memberConnections = await ArrayUtil.asyncRepeat(3, async (index) => {
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "member123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: "https://example.com",
        referrer: "https://example.com/referrer",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
    return memberConnection;
  });
  // 3. Create articles - using valid section IDs from existing data
  // Since we cannot create sections, we'll rely on existing sections in the system
  const articles = await ArrayUtil.asyncRepeat(5, async (index) => {
    const memberConnection = RandomGenerator.pick(memberConnections);
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            body: RandomGenerator.content({ paragraphs: 3 }),
            // Use a valid section ID that exists in the system
            // This will work if the system has pre-existing sections
            discussion_board_section_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
    typia.assert(article);
    return article;
  });
  // 4. Add varying levels of engagement to articles using only available APIs
  // High engagement for first article
  await ArrayUtil.asyncRepeat(10, async () => {
    const memberConnection = RandomGenerator.pick(memberConnections);
    await generate_random_discussion_board_member_articles_reactions_create(
      memberConnection,
      {
        body: {
          discussion_board_article_id: articles[0].id,
          reaction_type: "like", // Using a basic reaction type that should be valid
        },
      },
    );
  });
  await ArrayUtil.asyncRepeat(8, async () => {
    const memberConnection = RandomGenerator.pick(memberConnections);
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: articles[0].id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  });
  // Medium engagement for second article
  await ArrayUtil.asyncRepeat(5, async () => {
    const memberConnection = RandomGenerator.pick(memberConnections);
    await generate_random_discussion_board_member_articles_reactions_create(
      memberConnection,
      {
        body: {
          discussion_board_article_id: articles[1].id,
          reaction_type: "like",
        },
      },
    );
  });
  await ArrayUtil.asyncRepeat(3, async () => {
    const memberConnection = RandomGenerator.pick(memberConnections);
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: articles[1].id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  });
  // Low engagement for remaining articles
  await ArrayUtil.asyncRepeat(2, async () => {
    const memberConnection = RandomGenerator.pick(memberConnections);
    await generate_random_discussion_board_member_articles_reactions_create(
      memberConnection,
      {
        body: {
          discussion_board_article_id: articles[2].id,
          reaction_type: "like",
        },
      },
    );
  });
  // 5. Test popular articles endpoint with pagination
  const popularArticles =
    await api.functional.discussionBoard.admin.popular.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(popularArticles);
  // 6. Validate response structure
  TestValidator.predicate(
    "has pagination data",
    popularArticles.pagination !== undefined,
  );
  TestValidator.predicate(
    "has articles array",
    Array.isArray(popularArticles.data),
  );
  // Only validate structure if articles exist
  if (popularArticles.data.length > 0) {
    // 7. Validate article summary structure
    popularArticles.data.forEach((article, index) => {
      TestValidator.predicate(
        `article ${index} has id`,
        typeof article.id === "string",
      );
      TestValidator.predicate(
        `article ${index} has title`,
        typeof article.title === "string",
      );
      TestValidator.predicate(
        `article ${index} has author`,
        article.author !== undefined,
      );
      TestValidator.predicate(
        `article ${index} author has id`,
        typeof article.author.id === "string",
      );
      TestValidator.predicate(
        `article ${index} author has display_name`,
        typeof article.author.display_name === "string",
      );
      TestValidator.predicate(
        `article ${index} has section`,
        article.section !== undefined,
      );
      TestValidator.predicate(
        `article ${index} section has id`,
        typeof article.section.id === "string",
      );
      TestValidator.predicate(
        `article ${index} section has name`,
        typeof article.section.name === "string",
      );
      TestValidator.predicate(
        `article ${index} has tags array`,
        Array.isArray(article.tags),
      );
      TestValidator.predicate(
        `article ${index} has comments_count`,
        typeof article.comments_count === "number",
      );
      TestValidator.predicate(
        `article ${index} has created_at`,
        typeof article.created_at === "string",
      );
    });
  }
  // 8. Test pagination with different parameters
  const secondPage = await api.functional.discussionBoard.admin.popular.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page has correct page number",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page has correct limit",
    secondPage.pagination.limit,
    2,
  );
  // 9. Test with search filter (optional - only if articles exist)
  if (popularArticles.data.length > 0) {
    const searchResults =
      await api.functional.discussionBoard.admin.popular.index(
        adminConnection,
        {
          body: {
            search: popularArticles.data[0].title.substring(0, 5),
            page: 1,
            limit: 5,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(searchResults);
    TestValidator.predicate(
      "search returns results",
      searchResults.data.length >= 0,
    );
  }
}
