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

export async function test_api_article_comment_pagination_settings_update_with_total_count(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create article as prerequisite - using utility function which handles section validation
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
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test boundary conditions: minimum values
  const minSettings = {
    comments_per_page: 1 satisfies number as number,
    total_comment_count: 0 satisfies number as number,
  } satisfies IDiscussionBoardCommentPaginationSetting.IUpdate;
  const minUpdatedSettings =
    await api.functional.discussionBoard.admin.articles.comment_pagination_settings.update(
      adminConnection,
      {
        articleId: article.id,
        body: minSettings,
      },
    );
  typia.assert(minUpdatedSettings);
  TestValidator.equals(
    "minimum comments_per_page",
    minUpdatedSettings.comments_per_page,
    1,
  );
  TestValidator.equals(
    "minimum total_comment_count",
    minUpdatedSettings.total_comment_count,
    0,
  );
  // Test boundary conditions: maximum comments_per_page
  const maxSettings = {
    comments_per_page: 100 satisfies number as number,
    total_comment_count: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies IDiscussionBoardCommentPaginationSetting.IUpdate;
  const maxUpdatedSettings =
    await api.functional.discussionBoard.admin.articles.comment_pagination_settings.update(
      adminConnection,
      {
        articleId: article.id,
        body: maxSettings,
      },
    );
  typia.assert(maxUpdatedSettings);
  TestValidator.equals(
    "maximum comments_per_page",
    maxUpdatedSettings.comments_per_page,
    100,
  );
  // Test random values within constraints
  const randomSettings = {
    comments_per_page: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    total_comment_count: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies IDiscussionBoardCommentPaginationSetting.IUpdate;
  const randomUpdatedSettings =
    await api.functional.discussionBoard.admin.articles.comment_pagination_settings.update(
      adminConnection,
      {
        articleId: article.id,
        body: randomSettings,
      },
    );
  typia.assert(randomUpdatedSettings);
  TestValidator.equals(
    "random comments_per_page matches input",
    randomUpdatedSettings.comments_per_page,
    randomSettings.comments_per_page,
  );
  TestValidator.equals(
    "random total_comment_count matches input",
    randomUpdatedSettings.total_comment_count,
    randomSettings.total_comment_count,
  );
  TestValidator.predicate(
    "last_comment_count_update is valid date",
    () =>
      !isNaN(
        new Date(randomUpdatedSettings.last_comment_count_update).getTime(),
      ),
  );
}
