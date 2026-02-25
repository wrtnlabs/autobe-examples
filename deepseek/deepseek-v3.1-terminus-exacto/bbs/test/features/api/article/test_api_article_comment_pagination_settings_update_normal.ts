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
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_comment_pagination_settings_update_normal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Create article as prerequisite
  // Note: In a real test, we would need a valid discussion_board_section_id
  // For this test, we'll use a realistic UUID that matches the required format
  const article = await api.functional.discussionBoard.admin.articles.create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Update comment pagination settings
  const updateBody = {
    comments_per_page: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IDiscussionBoardCommentPaginationSetting.IUpdate;
  const updatedSettings =
    await api.functional.discussionBoard.admin.articles.comment_pagination_settings.update(
      adminConnection,
      {
        articleId: article.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSettings);
  // 4. Validate response
  TestValidator.equals(
    "comments per page should match update",
    updatedSettings.comments_per_page,
    updateBody.comments_per_page,
  );
  TestValidator.predicate(
    "total comment count should be non-negative",
    updatedSettings.total_comment_count >= 0,
  );
  TestValidator.predicate(
    "updated timestamp should be valid",
    new Date(updatedSettings.updated_at).getTime() > 0,
  );
  TestValidator.equals(
    "article relationship should exist",
    updatedSettings.article.id,
    article.id,
  );
}
