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

export async function test_api_comment_creation_different_users_same_article(
  connection: api.IConnection,
): Promise<void> {
  // Create first user
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {});
  typia.assert(user1);
  // Create second user
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {});
  typia.assert(user2);
  // Create article using first user
  const article = await generate_random_discussion_board_user_articles_create(
    user1Connection,
    {},
  );
  typia.assert(article);
  // User1 creates first comment
  const comment1 =
    await generate_random_discussion_board_user_articles_comments_create(
      user1Connection,
      {
        params: { articleId: article.id },
        body: {
          content: typia.random<string>(),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment1);
  // User2 creates second comment
  const comment2 =
    await generate_random_discussion_board_user_articles_comments_create(
      user2Connection,
      {
        params: { articleId: article.id },
        body: {
          content: typia.random<string>(),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment2);
  // Validate comment1 author attribution
  if (comment1.author.id !== user1.id) {
    throw new Error(
      `Comment1 author ID mismatch: expected ${user1.id}, got ${comment1.author.id}`,
    );
  }
  if (comment1.author.display_name !== user1.display_name) {
    throw new Error(
      `Comment1 author display name mismatch: expected ${user1.display_name}, got ${comment1.author.display_name}`,
    );
  }
  // Validate comment2 author attribution
  if (comment2.author.id !== user2.id) {
    throw new Error(
      `Comment2 author ID mismatch: expected ${user2.id}, got ${comment2.author.id}`,
    );
  }
  if (comment2.author.display_name !== user2.display_name) {
    throw new Error(
      `Comment2 author display name mismatch: expected ${user2.display_name}, got ${comment2.author.display_name}`,
    );
  }
  // Validate article association
  if (comment1.article.id !== article.id) {
    throw new Error(
      `Comment1 article ID mismatch: expected ${article.id}, got ${comment1.article.id}`,
    );
  }
  if (comment2.article.id !== article.id) {
    throw new Error(
      `Comment2 article ID mismatch: expected ${article.id}, got ${comment2.article.id}`,
    );
  }
  // Validate timestamps (comment1 should be created before comment2)
  const comment1Time = new Date(comment1.created_at);
  const comment2Time = new Date(comment2.created_at);
  if (comment1Time >= comment2Time) {
    throw new Error(
      `Comment timestamps out of order: comment1 at ${comment1.created_at}, comment2 at ${comment2.created_at}`,
    );
  }
  // Validate comment content
  if (comment1.content.length === 0) {
    throw new Error("Comment1 content is empty");
  }
  if (comment2.content.length === 0) {
    throw new Error("Comment2 content is empty");
  }
}
