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

export async function test_api_article_comment_pagination_settings_update_minimum_values(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create and authenticate regular user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 3. Create article using regular user - use typia.random for section_id since no section creation API exists
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: typia.random<IDiscussionBoardArticle.ICreate>(),
    },
  );
  typia.assert(article);
  // 4. Update comment pagination settings with minimum values using superAdmin
  const updatedSettings =
    await api.functional.discussionBoard.superAdmin.articles.comment_pagination_settings.update(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          comments_per_page: 1,
          total_comment_count: 0,
        } satisfies IDiscussionBoardCommentPaginationSetting.IUpdate,
      },
    );
  typia.assert(updatedSettings);
  // 5. Validate minimum values are accepted
  TestValidator.equals(
    "comments_per_page should be minimum value 1",
    updatedSettings.comments_per_page,
    1,
  );
  TestValidator.equals(
    "total_comment_count should be minimum value 0",
    updatedSettings.total_comment_count,
    0,
  );
  TestValidator.predicate(
    "last_comment_count_update should be valid date",
    !isNaN(new Date(updatedSettings.last_comment_count_update).getTime()),
  );
}
