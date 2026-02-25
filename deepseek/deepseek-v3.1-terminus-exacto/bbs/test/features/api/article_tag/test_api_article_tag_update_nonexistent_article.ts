import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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

export async function test_api_article_tag_update_nonexistent_article(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Generate random non-existent article UUID and tag UUID
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  const tagId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to update tag on non-existent article - should return 404
  await TestValidator.httpError(
    "should return 404 for non-existent article",
    404,
    async () => {
      await api.functional.discussionBoard.user.articles.tags.update(
        userConnection,
        {
          articleId: nonExistentArticleId,
          tagId: tagId,
          body: {
            tag_name: "updated tag",
          } satisfies IDiscussionBoardArticleTag.IUpdate,
        },
      );
    },
  );
}
