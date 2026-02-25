import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register user and get authenticated connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // 2. Create a parent article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(article);
  // 3. Create a comment on the article
  const commentContent = RandomGenerator.paragraph({ sentences: 3 });
  const createdComment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: { content: commentContent },
      },
    );
  typia.assert(createdComment);
  // 4. Retrieve the comment using public endpoint (no auth needed)
  const retrievedComment =
    await api.functional.discussionBoard.articles.comments.at(connection, {
      articleId: article.id,
      commentId: createdComment.id,
    });
  typia.assert(retrievedComment);
  // 5. Validate retrieved comment data
  TestValidator.equals(
    "comment id matches",
    retrievedComment.id,
    createdComment.id,
  );
  TestValidator.equals(
    "content matches",
    retrievedComment.content,
    commentContent,
  );
  TestValidator.equals(
    "citizen_id present",
    retrievedComment.citizen_id,
    createdComment.citizen_id,
  );
  TestValidator.equals(
    "author id matches",
    retrievedComment.author.id,
    user.id,
  );
  TestValidator.equals(
    "author displayName matches",
    retrievedComment.author.displayName,
    user.displayName,
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    !isNaN(Date.parse(retrievedComment.created_at)),
  );
  TestValidator.equals(
    "updated_at is null for new comment",
    retrievedComment.updated_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for active comment",
    retrievedComment.deleted_at,
    null,
  );
}
