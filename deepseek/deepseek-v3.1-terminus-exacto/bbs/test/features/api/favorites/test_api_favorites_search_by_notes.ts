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

export async function test_api_favorites_search_by_notes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup with utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create section with utility function
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
  // 3. Member setup with utility function
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
  // 4. Create articles with utility functions
  const articles: IDiscussionBoardArticle[] = [];
  for (let i = 0; i < 3; i++) {
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
  }
  // 5. Create favorites with utility functions
  const favorites: IDiscussionBoardArticleFavorite[] = [];
  // First favorite with "important analysis" in notes
  const favorite1 =
    await generate_random_discussion_board_member_favorites_create(
      memberConnection,
      {
        body: {
          discussion_board_article_id: articles[0].id,
          notes: "This is an important analysis of the topic",
          category: "research",
        } satisfies IDiscussionBoardArticleFavorite.ICreate,
      },
    );
  typia.assert(favorite1);
  favorites.push(favorite1);
  // Second favorite with "follow up later" in notes
  const favorite2 =
    await generate_random_discussion_board_member_favorites_create(
      memberConnection,
      {
        body: {
          discussion_board_article_id: articles[1].id,
          notes: "Need to follow up later with more details",
          category: "todo",
        } satisfies IDiscussionBoardArticleFavorite.ICreate,
      },
    );
  typia.assert(favorite2);
  favorites.push(favorite2);
  // Third favorite with null notes
  const favorite3 =
    await generate_random_discussion_board_member_favorites_create(
      memberConnection,
      {
        body: {
          discussion_board_article_id: articles[2].id,
          notes: null,
          category: "general",
        } satisfies IDiscussionBoardArticleFavorite.ICreate,
      },
    );
  typia.assert(favorite3);
  favorites.push(favorite3);
  // 6. Test search functionality
  // Search for "important" - should match first favorite
  const searchImportant =
    await api.functional.discussionBoard.member.favorites.index(
      memberConnection,
      {
        body: {
          search: "important",
        } satisfies IDiscussionBoardArticleFavorite.IRequest,
      },
    );
  typia.assert(searchImportant);
  TestValidator.equals(
    "search 'important' returns 1 result",
    searchImportant.data.length,
    1,
  );
  TestValidator.equals(
    "search 'important' matches correct favorite",
    searchImportant.data[0].id,
    favorite1.id,
  );
  // Search for "follow" - should match second favorite
  const searchFollow =
    await api.functional.discussionBoard.member.favorites.index(
      memberConnection,
      {
        body: {
          search: "follow",
        } satisfies IDiscussionBoardArticleFavorite.IRequest,
      },
    );
  typia.assert(searchFollow);
  TestValidator.equals(
    "search 'follow' returns 1 result",
    searchFollow.data.length,
    1,
  );
  TestValidator.equals(
    "search 'follow' matches correct favorite",
    searchFollow.data[0].id,
    favorite2.id,
  );
  // Search for "analysis" - should match first favorite
  const searchAnalysis =
    await api.functional.discussionBoard.member.favorites.index(
      memberConnection,
      {
        body: {
          search: "analysis",
        } satisfies IDiscussionBoardArticleFavorite.IRequest,
      },
    );
  typia.assert(searchAnalysis);
  TestValidator.equals(
    "search 'analysis' returns 1 result",
    searchAnalysis.data.length,
    1,
  );
  TestValidator.equals(
    "search 'analysis' matches correct favorite",
    searchAnalysis.data[0].id,
    favorite1.id,
  );
  // Search for "later" - should match second favorite
  const searchLater =
    await api.functional.discussionBoard.member.favorites.index(
      memberConnection,
      {
        body: {
          search: "later",
        } satisfies IDiscussionBoardArticleFavorite.IRequest,
      },
    );
  typia.assert(searchLater);
  TestValidator.equals(
    "search 'later' returns 1 result",
    searchLater.data.length,
    1,
  );
  TestValidator.equals(
    "search 'later' matches correct favorite",
    searchLater.data[0].id,
    favorite2.id,
  );
  // Search for non-existent term
  const searchNonexistent =
    await api.functional.discussionBoard.member.favorites.index(
      memberConnection,
      {
        body: {
          search: "nonexistentterm",
        } satisfies IDiscussionBoardArticleFavorite.IRequest,
      },
    );
  typia.assert(searchNonexistent);
  TestValidator.equals(
    "search nonexistent term returns empty",
    searchNonexistent.data.length,
    0,
  );
  // Search with empty string should return all favorites
  const searchEmpty =
    await api.functional.discussionBoard.member.favorites.index(
      memberConnection,
      {
        body: {
          search: "",
        } satisfies IDiscussionBoardArticleFavorite.IRequest,
      },
    );
  typia.assert(searchEmpty);
  TestValidator.equals(
    "empty search returns all favorites",
    searchEmpty.data.length,
    3,
  );
  // Test case-insensitive search
  const searchCaseInsensitive =
    await api.functional.discussionBoard.member.favorites.index(
      memberConnection,
      {
        body: {
          search: "IMPORTANT",
        } satisfies IDiscussionBoardArticleFavorite.IRequest,
      },
    );
  typia.assert(searchCaseInsensitive);
  TestValidator.equals(
    "case-insensitive search returns 1 result",
    searchCaseInsensitive.data.length,
    1,
  );
  TestValidator.equals(
    "case-insensitive search matches correct favorite",
    searchCaseInsensitive.data[0].id,
    favorite1.id,
  );
  // Test search with category filter
  const searchWithCategory =
    await api.functional.discussionBoard.member.favorites.index(
      memberConnection,
      {
        body: {
          search: "important",
          category: "research",
        } satisfies IDiscussionBoardArticleFavorite.IRequest,
      },
    );
  typia.assert(searchWithCategory);
  TestValidator.equals(
    "search with category returns 1 result",
    searchWithCategory.data.length,
    1,
  );
  TestValidator.equals(
    "search with category matches correct favorite",
    searchWithCategory.data[0].id,
    favorite1.id,
  );
  // Test search with wrong category (should return empty)
  const searchWithWrongCategory =
    await api.functional.discussionBoard.member.favorites.index(
      memberConnection,
      {
        body: {
          search: "important",
          category: "todo",
        } satisfies IDiscussionBoardArticleFavorite.IRequest,
      },
    );
  typia.assert(searchWithWrongCategory);
  TestValidator.equals(
    "search with wrong category returns empty",
    searchWithWrongCategory.data.length,
    0,
  );
  // Test pagination with search
  const searchWithPagination =
    await api.functional.discussionBoard.member.favorites.index(
      memberConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardArticleFavorite.IRequest,
      },
    );
  typia.assert(searchWithPagination);
  TestValidator.equals(
    "search with pagination returns limited results",
    searchWithPagination.data.length,
    2,
  );
  TestValidator.equals(
    "search pagination has correct total records",
    searchWithPagination.pagination.records,
    3,
  );
}
