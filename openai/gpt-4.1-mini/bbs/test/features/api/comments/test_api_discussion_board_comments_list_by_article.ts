import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_discussion_board_comments_list_by_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new registered user
  const userJoinConnection: api.IConnection = { host: connection.host };
  const user = await authorize_registered_user_join(userJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234!",
    },
  });
  typia.assert(user);
  // 2. Create articles by the registered user
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: user.token.access };
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: { sectionId: typia.random<string & tags.Format<"uuid">>() } },
    );
  typia.assert(article);
  // 3. Retrieve comments list filtered by articleId, page 1, limit 3
  const page = 1;
  const limit = 3;
  const response =
    await api.functional.discussionBoard.registeredUser.comments.index(
      userConnection,
      {
        body: {
          discussionBoardArticleId: article.id,
          page,
          limit,
        },
      },
    );
  typia.assert(response);
  // 4. Validate response pagination properties
  TestValidator.predicate(
    "page current is correct",
    response.pagination.current === page,
  );
  TestValidator.predicate(
    "page limit is correct",
    response.pagination.limit === limit,
  );
  TestValidator.predicate(
    "page records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate comment count is at most limit
  TestValidator.predicate(
    "response data length at most limit",
    response.data.length <= limit,
  );
  // 6. If there are comments, validate comment ordering by oldest first (createdAt ascending)
  for (let i = 1; i < response.data.length; ++i) {
    const prevDate = new Date(response.data[i - 1].createdAt);
    const currDate = new Date(response.data[i].createdAt);
    TestValidator.predicate(
      `comment ${i} createdAt is equal or after comment ${i - 1}`,
      prevDate <= currDate,
    );
  }
  // 7. Validate data content properties
  for (const comment of response.data) {
    TestValidator.predicate(
      "comment id is valid uuid",
      /^[0-9a-f\-]{36}$/i.test(comment.id),
    );
    TestValidator.predicate(
      "comment content is non-empty",
      comment.content.length > 0,
    );
    TestValidator.predicate(
      "comment author displayName exists",
      typeof comment.author.displayName === "string" &&
        comment.author.displayName.length > 0,
    );
    TestValidator.predicate(
      "comment createdAt format valid",
      typeof comment.createdAt === "string" && comment.createdAt.length > 0,
    );
  }
}
