import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test retrieval of comment pagination settings for an article with published comments.
 * Steps:
 * 1. Setup: Create admin, create section, create user, create article.
 * 2. Generate Comments: Add multiple comments to generate pagination data.
 * 3. Retrieve Settings: Fetch comment pagination settings and validate.
 * 4. Assertions: Verify comments_per_page (default 50), total_comment_count matches created comments,
 *    last_comment_count_update is valid timestamp, and article relationship exists.
 */
export async function test_api_article_comment_pagination_settings_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Admin setup for section creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Create a discussion section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 4,
        }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<number & tags.Type<"int32">>(),
      },
    },
  );
  typia.assert(section);
  // User setup (article author)
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // Create article in the section
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        discussion_board_section_id: section.id,
      },
    },
  );
  typia.assert(article);
  // Generate multiple comments (5 comments for meaningful pagination)
  const commentCount = 5;
  const createdComments: IDiscussionBoardComment[] = [];
  for (let i = 0; i < commentCount; i++) {
    const comment =
      await generate_random_discussion_board_user_articles_comments_create(
        userConnection,
        {
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          },
          params: {
            articleId: article.id,
          },
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }
  // Retrieve comment pagination settings
  const settings =
    await api.functional.discussionBoard.articles.comment_pagination_settings.at(
      userConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(settings);
  // Validate pagination settings
  // Default comment per page is 50 according to requirements
  TestValidator.equals(
    "comments_per_page should be 50 (system default)",
    settings.comments_per_page,
    50,
  );
  // Total comment count should match number of comments created
  TestValidator.equals(
    "total_comment_count should match created comments",
    settings.total_comment_count,
    commentCount,
  );
  // Validate last_comment_count_update is a valid timestamp
  TestValidator.predicate(
    "last_comment_count_update should be a valid ISO datetime",
    () => !isNaN(Date.parse(settings.last_comment_count_update)),
  );
  // Validate article relationship exists
  TestValidator.equals(
    "article id in relationship should match created article",
    settings.article.id,
    article.id,
  );
  // Validate article summary structure
  typia.assert(settings.article);
}
