import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardCommentPaginationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentPaginationSetting";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_comment_pagination_settings_update_normal_configuration(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as superAdmin for initial setup
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // Create new superAdmin connection for actual operations
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: superAdminAuth.email,
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Create user account and authenticate
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create new user connection for article creation
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userConnection, {
    body: {
      email: userAuth.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardUser.ILogin,
  });
  // Create an article with valid data
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Update comment pagination settings using SDK function (no utility available)
  const updateBody: IDiscussionBoardCommentPaginationSetting.IUpdate = {
    comments_per_page: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    total_comment_count: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  };
  const updatedSettings =
    await api.functional.discussionBoard.superAdmin.articles.comment_pagination_settings.update(
      superAdminConnection,
      {
        articleId: article.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSettings);
  // Validate the updated settings
  TestValidator.equals(
    "comments_per_page matches input",
    updatedSettings.comments_per_page,
    updateBody.comments_per_page,
  );
  TestValidator.equals(
    "total_comment_count matches input",
    updatedSettings.total_comment_count,
    updateBody.total_comment_count,
  );
  TestValidator.predicate(
    "comments_per_page within valid range",
    updatedSettings.comments_per_page >= 1 &&
      updatedSettings.comments_per_page <= 100,
  );
  TestValidator.predicate(
    "total_comment_count non-negative",
    updatedSettings.total_comment_count >= 0,
  );
  TestValidator.predicate(
    "last_comment_count_update is recent",
    new Date(updatedSettings.last_comment_count_update) <= new Date(),
  );
}
