import api from "@ORGANIZATION/PROJECT-api";
import type { IConnection } from "@nestia/fetcher";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_comments_create } from "../../../generate/generate_random_discussion_board_registered_user_comments_create";

export async function test_api_comment_snapshot_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create a registered user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_registered_user_join(userConnection, { body: {} });
  await authorize_registered_user_login(userConnection, { body: {} });
  // Create an article from the registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(userConnection, {});
  typia.assert(article);

  // Safely extract article ID with typia.cast to string & uuid format
  const articleId = typia.assert<string & tags.Format<"uuid">>(
    (article as any).id ?? (article as any).article_id,
  );

  // Create a comment on the article from the registered user
  const comment =
    await generate_random_discussion_board_registered_user_comments_create(userConnection, {
      body: {
        article_id: articleId,
        content: RandomGenerator.paragraph(),
      } satisfies Parameters<typeof api.functional.discussionBoard.registeredUser.comments.create>[1]["body"],
    });
  typia.assert(comment);

  // Safely extract comment ID with typia.assert to string & uuid format
  const commentId = typia.assert<string & tags.Format<"uuid">>(
    (comment as any).id ?? (comment as any).comment_id,
  );

  // Create an administrator and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  await authorize_administrator_login(adminConnection, { body: {} });

  // Use invalid UUIDs for commentId and snapshotId
  const invalidCommentId =
    "00000000-0000-0000-0000-000000000000" satisfies string &
    tags.Format<"uuid">;
  const invalidSnapshotId =
    "00000000-0000-0000-0000-000000000000" satisfies string &
    tags.Format<"uuid">;

  // Test 404 for non-existent snapshot of existing commentId
  await TestValidator.httpError(
    "404 when snapshot not found for comment",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.comments.snapshots.atSnapshot(
        adminConnection,
        { commentId: commentId, snapshotId: invalidSnapshotId },
      );
    },
  );

  // Test 404 for non-existent commentId and snapshotId
  await TestValidator.httpError(
    "404 when comment and snapshot both not found",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.comments.snapshots.atSnapshot(
        adminConnection,
        { commentId: invalidCommentId, snapshotId: invalidSnapshotId },
      );
    },
  );

  // Test unauthorized access: Use userConnection (non-admin) to access snapshot retrieval
  await TestValidator.httpError(
    "unauthorized access forbidden for non-admin",
    403,
    async () => {
      await api.functional.discussionBoard.administrator.comments.snapshots.atSnapshot(
        userConnection,
        { commentId: commentId, snapshotId: invalidSnapshotId },
      );
    },
  );
}
