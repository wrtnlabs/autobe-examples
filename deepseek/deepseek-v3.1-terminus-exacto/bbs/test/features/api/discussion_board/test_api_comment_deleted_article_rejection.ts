import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_deleted_article_rejection(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario cannot be implemented with the current API endpoints
  // because article deletion functionality is not available in the provided SDK.
  // The test requires a DELETE /discussionBoard/user/articles/{articleId} endpoint
  // to properly test commenting on deleted articles.
  // Since we cannot delete articles, we'll test commenting on non-existent articles
  // to validate that the system properly handles invalid article IDs.
  // 1. Create user account and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 2. Attempt to create comment on non-existent article
  await TestValidator.error(
    "comment creation on non-existent article should fail",
    async () => {
      await generate_random_discussion_board_user_articles_comments_create(
        userConnection,
        {
          params: { articleId: typia.random<string & tags.Format<"uuid">>() },
          body: {
            content: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );
}
