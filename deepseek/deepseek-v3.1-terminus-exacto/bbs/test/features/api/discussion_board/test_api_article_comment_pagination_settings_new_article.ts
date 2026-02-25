import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardCommentPaginationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentPaginationSetting";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_comment_pagination_settings_new_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection and create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 2,
          wordMax: 5,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 2,
          sentenceMax: 4,
          wordMin: 3,
          wordMax: 7,
        }),
        status: "active",
        display_order: 1,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 2. Setup user connection and create article
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 8,
        }) satisfies string as string & tags.MinLength<5> & tags.MaxLength<200>,
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 6,
          wordMin: 4,
          wordMax: 8,
        }) satisfies string as string & tags.MinLength<50>,
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Test pagination settings for new article (no comments yet)
  // Create a new connection specifically for the pagination settings call
  const paginationConnection: api.IConnection = { host: connection.host };
  const paginationSettings =
    await api.functional.discussionBoard.articles.comment_pagination_settings.at(
      paginationConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(paginationSettings);
  // 4. Validate pagination settings for new article
  TestValidator.equals(
    "article reference",
    paginationSettings.article.id,
    article.id,
  );
  TestValidator.equals(
    "total comment count should be 0 for new article",
    paginationSettings.total_comment_count,
    0,
  );
  TestValidator.predicate(
    "comments per page should be valid",
    () =>
      paginationSettings.comments_per_page >= 1 &&
      paginationSettings.comments_per_page <= 100,
  );
  TestValidator.predicate(
    "last comment count update should be valid timestamp",
    () => {
      const updateTime = new Date(paginationSettings.last_comment_count_update);
      return !isNaN(updateTime.getTime()) && updateTime <= new Date();
    },
  );
  TestValidator.predicate("created_at timestamp should be valid", () => {
    const createdTime = new Date(paginationSettings.created_at);
    return !isNaN(createdTime.getTime()) && createdTime <= new Date();
  });
  TestValidator.predicate("updated_at timestamp should be valid", () => {
    const updatedTime = new Date(paginationSettings.updated_at);
    return !isNaN(updatedTime.getTime()) && updatedTime <= new Date();
  });
}
