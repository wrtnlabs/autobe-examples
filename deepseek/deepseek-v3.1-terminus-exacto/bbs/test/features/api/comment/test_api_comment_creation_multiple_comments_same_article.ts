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

export async function test_api_comment_creation_multiple_comments_same_article(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(authorizedUser);
  // Create an article for commenting
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      },
    },
  );
  typia.assert(article);
  // Create multiple comments on the same article
  const commentCount = 3;
  const comments: IDiscussionBoardComment[] = [];
  for (let i = 0; i < commentCount; i++) {
    const comment =
      await generate_random_discussion_board_user_articles_comments_create(
        userConnection,
        {
          params: { articleId: article.id },
          body: {
            content: RandomGenerator.paragraph({ sentences: 3 }),
          },
        },
      );
    typia.assert(comment);
    comments.push(comment);
    // Validate comment properties
    TestValidator.predicate("comment has valid ID", comment.id.length > 0);
    TestValidator.equals(
      "comment author matches user",
      comment.author.id,
      authorizedUser.id,
    );
    TestValidator.equals(
      "comment article matches",
      comment.article.id,
      article.id,
    );
  }
  // Validate uniqueness of comment IDs
  const commentIds = comments.map((comment) => comment.id);
  const uniqueIds = new Set(commentIds);
  TestValidator.equals(
    "all comment IDs are unique",
    uniqueIds.size,
    commentCount,
  );
  // Validate chronological order (created_at should be increasing)
  for (let i = 1; i < comments.length; i++) {
    const prevComment = comments[i - 1];
    const currentComment = comments[i];
    const prevTime = new Date(prevComment.created_at).getTime();
    const currentTime = new Date(currentComment.created_at).getTime();
    TestValidator.predicate(
      `comments ${i - 1} and ${i} are in chronological order`,
      prevTime <= currentTime,
    );
  }
  // Validate consistent author information across all comments
  const firstAuthorId = comments[0].author.id;
  const firstAuthorName = comments[0].author.display_name;
  for (let i = 0; i < comments.length; i++) {
    TestValidator.equals(
      `author ID consistent for comment ${i}`,
      comments[i].author.id,
      firstAuthorId,
    );
    TestValidator.equals(
      `author name consistent for comment ${i}`,
      comments[i].author.display_name,
      firstAuthorName,
    );
  }
}
