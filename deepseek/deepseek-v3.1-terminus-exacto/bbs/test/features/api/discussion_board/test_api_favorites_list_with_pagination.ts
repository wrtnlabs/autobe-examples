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

export async function test_api_favorites_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 2. Member setup - create member account
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
  // 3. Create multiple articles
  const articles = await ArrayUtil.asyncRepeat(5, async (index) => {
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
  // 4. Favorite all articles with optional categorization
  const favorites = await ArrayUtil.asyncRepeat(5, async (index) => {
    const favorite =
      await generate_random_discussion_board_member_favorites_create(
        memberConnection,
        {
          body: {
            discussion_board_article_id: articles[index].id,
            category: index % 2 === 0 ? "to-read" : "research",
            notes:
              index % 3 === 0
                ? RandomGenerator.paragraph({ sentences: 1 })
                : null,
          } satisfies IDiscussionBoardArticleFavorite.ICreate,
        },
      );
    typia.assert(favorite);
    return favorite;
  });
  // 5. Test pagination with different page and limit combinations
  const testCases = [
    { page: 1, limit: 2 },
    { page: 2, limit: 2 },
    { page: 3, limit: 2 },
    { page: 1, limit: 5 },
    { page: 1, limit: 10 },
  ];
  for (const testCase of testCases) {
    const response =
      await api.functional.discussionBoard.member.favorites.index(
        memberConnection,
        {
          body: {
            page: testCase.page satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1>,
            limit: testCase.limit satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IDiscussionBoardArticleFavorite.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals(
      `pagination current page for page=${testCase.page}, limit=${testCase.limit}`,
      response.pagination.current,
      testCase.page,
    );
    TestValidator.equals(
      `pagination limit for page=${testCase.page}, limit=${testCase.limit}`,
      response.pagination.limit,
      testCase.limit,
    );
    TestValidator.equals(
      `total records for page=${testCase.page}, limit=${testCase.limit}`,
      response.pagination.records,
      5,
    );
    TestValidator.equals(
      `total pages for page=${testCase.page}, limit=${testCase.limit}`,
      response.pagination.pages,
      Math.ceil(5 / testCase.limit),
    );
    // Validate data count
    TestValidator.equals(
      `data count for page=${testCase.page}, limit=${testCase.limit}`,
      response.data.length,
      Math.min(
        testCase.limit,
        Math.max(0, 5 - (testCase.page - 1) * testCase.limit),
      ),
    );
    // Validate favorites are in descending chronological order (newest first)
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        `favorite ${i} created after favorite ${i + 1} for page=${testCase.page}, limit=${testCase.limit}`,
        new Date(response.data[i - 1].created_at) >=
          new Date(response.data[i].created_at),
      );
    }
    // Validate each favorite contains required fields
    for (const favorite of response.data) {
      TestValidator.predicate(
        `favorite has article title for page=${testCase.page}, limit=${testCase.limit}`,
        typeof favorite.article.title === "string" &&
          favorite.article.title.length > 0,
      );
      TestValidator.predicate(
        `favorite has author display name for page=${testCase.page}, limit=${testCase.limit}`,
        typeof favorite.article.author.display_name === "string" &&
          favorite.article.author.display_name.length > 0,
      );
      TestValidator.predicate(
        `favorite has creation timestamp for page=${testCase.page}, limit=${testCase.limit}`,
        typeof favorite.article.created_at === "string" &&
          favorite.article.created_at.length > 0,
      );
    }
  }
}
