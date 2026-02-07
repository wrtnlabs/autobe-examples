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
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_comment_pagination_settings_update_basic_configuration(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create an article as prerequisite using the generation function
  const article = await generate_random_discussion_board_user_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
        status: "published",
      } satisfies DeepPartial<IDiscussionBoardArticle.ICreate>,
    },
  );
  typia.assert(article);
  // Update comment pagination settings with a valid configuration
  const updateBody: IDiscussionBoardCommentPaginationSetting.IUpdate = {
    comments_per_page: 25 satisfies number as number, // Use a reasonable default value
  };
  const updatedSettings =
    await api.functional.discussionBoard.admin.articles.comment_pagination_settings.update(
      adminConnection,
      {
        articleId: article.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSettings);
  // Validate the updated settings
  TestValidator.equals(
    "comments_per_page should match input",
    updatedSettings.comments_per_page,
    updateBody.comments_per_page!,
  );
  TestValidator.predicate(
    "total_comment_count should be non-negative",
    updatedSettings.total_comment_count >= 0,
  );
  TestValidator.predicate(
    "settings should have valid timestamps",
    new Date(updatedSettings.created_at) <=
      new Date(updatedSettings.updated_at),
  );
}
