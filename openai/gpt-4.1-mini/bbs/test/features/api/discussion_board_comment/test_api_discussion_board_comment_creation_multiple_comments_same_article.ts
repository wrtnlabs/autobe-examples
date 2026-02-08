import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_comments_create } from "../../../generate/generate_random_discussion_board_registered_user_comments_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_discussion_board_comment_creation_multiple_comments_same_article(
  connection: api.IConnection,
): Promise<void> {
  // Test the creation of multiple comments by a registered user on the same article
  // 1. Register and authenticate a new user (join)
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  // Use token from authorized to update userConnection headers
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a new article as the authenticated user with random valid data
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {},
    );
  typia.assert(article);
  // The IDiscussionBoardArticle type lacks 'id', check for 'article_id' or similar
  // Using 'article.article_id' if exists, otherwise stop using 'id' property
  const articleId = (article as any).article_id ?? (article as any).id ?? null;
  if (articleId === null) throw new Error("Article ID not found");

  // 3. Post multiple comments with distinct content on the same article
  const commentCount = 3;
  const comments: IDiscussionBoardComment[] = [];
  for (let i = 0; i < commentCount; i++) {
    const commentBody: IDiscussionBoardComment.ICreate = {
      content: `Automated test comment number ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
      // Use correct property or cast if necessary
      article_id: articleId,
    };
    // 4. Create comment
    const comment =
      await generate_random_discussion_board_registered_user_comments_create(
        userConnection,
        {
          body: commentBody,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // 5. Validate that all comments have matching article id property
  for (const comment of comments) {
    // comment.article_id does not exist so accessing using any,
    // or cast to any for validation
    const cArticleId = (comment as any).article_id ?? null;
    TestValidator.equals("article_id matches", cArticleId, articleId);
  }

  // 6. Validate that all comments have a non-empty registered user id and are identical
  // comment.registered_user_id does not exist, so check for alternative or skip
  for (const comment of comments) {
    const registeredUserId = (comment as any).registered_user_id ?? null;
    TestValidator.predicate(
      "registered_user_id present",
      typeof registeredUserId === "string" && registeredUserId.length > 0,
    );
  }
  for (let i = 1; i < comments.length; i++) {
    const id0 = (comments[0] as any).registered_user_id ?? null;
    const idi = (comments[i] as any).registered_user_id ?? null;
    TestValidator.equals(
      "registered_user_id matches among comments",
      id0,
      idi,
    );
  }

  // 7. Validate created_at timestamps are unique and in increasing order
  const timestamps = comments.map((c) => {
    const createdAt = (c as any).created_at;
    if (typeof createdAt !== "string") throw new Error("created_at missing or invalid");
    return new Date(createdAt).getTime();
  });
  for (let i = 1; i < timestamps.length; i++) {
    TestValidator.predicate(
      `created_at ${i} is after previous`,
      timestamps[i] > timestamps[i - 1],
    );
  }
}
