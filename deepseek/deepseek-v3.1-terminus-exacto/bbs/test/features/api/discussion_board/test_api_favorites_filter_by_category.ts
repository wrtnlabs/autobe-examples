import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFavorite";
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
import { generate_random_discussion_board_member_favorites_create } from "../../../generate/generate_random_discussion_board_member_favorites_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_favorite } from "../../../prepare/prepare_random_discussion_board_article_favorite";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_favorites_filter_by_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a section for articles
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
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
  // 4. Create three articles
  const articles = await ArrayUtil.asyncRepeat(3, async () => {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            body: RandomGenerator.content({ paragraphs: 3 }),
            discussion_board_section_id: section.id,
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    return article;
  });
  // 5. Create favorites with different categories
  const categories = ["to-read", "research", "personal"] as const;
  const favorites = await ArrayUtil.asyncMap(
    articles,
    async (article, index) => {
      const favorite =
        await generate_random_discussion_board_member_favorites_create(
          memberConnection,
          {
            body: {
              discussion_board_article_id: article.id,
              category: categories[index],
              notes: RandomGenerator.paragraph({ sentences: 1 }),
            } satisfies IDiscussionBoardArticleFavorite.ICreate,
          },
        );
      typia.assert(favorite);
      return favorite;
    },
  );
  // 6. Test filtering by each category
  for (const category of categories) {
    const filteredFavorites =
      await api.functional.discussionBoard.member.favorites.index(
        memberConnection,
        {
          body: {
            category,
            limit: 10,
            page: 1,
          } satisfies IDiscussionBoardArticleFavorite.IRequest,
        },
      );
    typia.assert(filteredFavorites);
    // Should return exactly one favorite matching the category
    TestValidator.equals(
      `favorites count for category ${category}`,
      filteredFavorites.data.length,
      1,
    );
    TestValidator.equals(
      `favorite category matches ${category}`,
      filteredFavorites.data[0].category,
      category,
    );
  }
  // 7. Test filtering with null category (should return all favorites)
  const allFavorites =
    await api.functional.discussionBoard.member.favorites.index(
      memberConnection,
      {
        body: {
          category: null,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardArticleFavorite.IRequest,
      },
    );
  typia.assert(allFavorites);
  TestValidator.equals(
    "null category returns all favorites",
    allFavorites.data.length,
    favorites.length,
  );
  // 8. Test filtering with non-existent category (should return empty)
  const emptyFavorites =
    await api.functional.discussionBoard.member.favorites.index(
      memberConnection,
      {
        body: {
          category: "non-existent-category",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardArticleFavorite.IRequest,
      },
    );
  typia.assert(emptyFavorites);
  TestValidator.equals(
    "non-existent category returns empty list",
    emptyFavorites.data.length,
    0,
  );
  // 9. Test case-sensitive filtering
  const caseSensitiveFavorites =
    await api.functional.discussionBoard.member.favorites.index(
      memberConnection,
      {
        body: {
          category: "TO-READ", // uppercase version
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardArticleFavorite.IRequest,
      },
    );
  typia.assert(caseSensitiveFavorites);
  TestValidator.equals(
    "case-sensitive filtering returns empty for mismatched case",
    caseSensitiveFavorites.data.length,
    0,
  );
}
