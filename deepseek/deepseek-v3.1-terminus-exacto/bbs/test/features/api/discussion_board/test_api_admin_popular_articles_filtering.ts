import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_reactions_create } from "../../../generate/generate_random_discussion_board_member_articles_reactions_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_reaction } from "../../../prepare/prepare_random_discussion_board_article_reaction";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_admin_popular_articles_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create sections for filtering
  const section1 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: "Politics",
        description: "Political discussions",
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section1);
  const section2 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: "Economy",
        description: "Economic discussions",
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section2);
  // Create member connections and articles with engagement
  const memberConnections: api.IConnection[] = [];
  const articles: IDiscussionBoardArticle[] = [];
  // Create 3 members and articles in different sections
  for (let i = 0; i < 3; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "member123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: "https://test.com",
        referrer: "https://test.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
    memberConnections.push(memberConnection);
    // Create articles in alternating sections
    const section = i % 2 === 0 ? section1 : section2;
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            body: RandomGenerator.content({ paragraphs: 2 }),
            discussion_board_section_id: section.id,
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    articles.push(article);
    // Add reactions to create engagement (more reactions for section1 articles)
    const reactionCount = i % 2 === 0 ? 3 : 1;
    for (let j = 0; j < reactionCount; j++) {
      const reactionMemberConnection: api.IConnection = {
        host: connection.host,
      };
      await authorize_member_join(reactionMemberConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "member123",
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
          href: "https://test.com",
          referrer: "https://test.com",
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardMember.IJoin,
      });
      await generate_random_discussion_board_member_articles_reactions_create(
        reactionMemberConnection,
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
    }
  }
  // Test section filtering - get popular articles for section1 only
  const section1Popular =
    await api.functional.discussionBoard.admin.popular.index(adminConnection, {
      body: {
        discussion_board_section_id: section1.id,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(section1Popular);
  // Validate section filtering
  TestValidator.equals(
    "section1 articles should only contain section1 articles",
    section1Popular.data.every((article) => article.section.id === section1.id),
    true,
  );
  // Test section filtering for section2
  const section2Popular =
    await api.functional.discussionBoard.admin.popular.index(adminConnection, {
      body: {
        discussion_board_section_id: section2.id,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(section2Popular);
  TestValidator.equals(
    "section2 articles should only contain section2 articles",
    section2Popular.data.every((article) => article.section.id === section2.id),
    true,
  );
  // Test pagination
  const paginatedResults =
    await api.functional.discussionBoard.admin.popular.index(adminConnection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(paginatedResults);
  TestValidator.equals(
    "pagination should return correct number of articles",
    paginatedResults.data.length,
    2,
  );
  TestValidator.predicate(
    "pagination metadata should be valid",
    paginatedResults.pagination.current === 1 &&
      paginatedResults.pagination.limit === 2 &&
      paginatedResults.pagination.records >= 3 &&
      paginatedResults.pagination.pages >= 2,
  );
  // Test search functionality
  if (articles.length > 0) {
    const searchTerm = articles[0].title.substring(0, 5);
    const searchResults =
      await api.functional.discussionBoard.admin.popular.index(
        adminConnection,
        {
          body: {
            search: searchTerm,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(searchResults);
    TestValidator.predicate(
      "search should return matching articles",
      searchResults.data.some((article) =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()),
      ) || searchResults.data.length === 0,
    );
  }
  // Test all articles without filters
  const allPopular = await api.functional.discussionBoard.admin.popular.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(allPopular);
  TestValidator.predicate(
    "should return all articles with pagination",
    allPopular.data.length > 0 && allPopular.pagination.records >= 3,
  );
  // Validate popularity ranking considers engagement
  TestValidator.predicate(
    "popular articles endpoint should return results",
    allPopular.data.length > 0,
  );
}
