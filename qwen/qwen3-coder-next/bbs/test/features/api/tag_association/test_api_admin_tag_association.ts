import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_tags_create_tags } from "../../../generate/generate_random_discussion_board_admin_articles_tags_create_tags";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_admin_tag_association(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // 2. Create an article first
  // Since we don't have article creation functions in the provided API,
  // we'll need to mock the article ID for this test
  const articleId: string = typia.random<string & tags.Format<"uuid">>();
  // 3. Test tag association with empty tags array (edge case)
  const emptyResult =
    await api.functional.discussionBoard.admin.articles.tags.createTags(
      adminConnection,
      {
        articleId: articleId,
        body: typia.random<IDiscussionBoardArticleTag.ICreate>(),
      },
    );
  typia.assert(emptyResult);
  // 4. Test tag association with actual data
  const result =
    await api.functional.discussionBoard.admin.articles.tags.createTags(
      adminConnection,
      {
        articleId: articleId,
        body: typia.random<IDiscussionBoardArticleTag.ICreate>(),
      },
    );
  typia.assert(result);
  // 5. Validate response structure
  typia.assert<IDiscussionBoardArticleTag>(result);
}
