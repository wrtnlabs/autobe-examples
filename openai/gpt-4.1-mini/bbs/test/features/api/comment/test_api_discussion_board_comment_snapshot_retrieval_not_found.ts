import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function test_api_discussion_board_comment_snapshot_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieval attempt of a non-existent comment snapshot by a registered user
  // 1. Register and authenticate a registered user
  const joinConnection: api.IConnection = { host: connection.host };
  const user = await authorize_registered_user_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    },
  });
  typia.assert(user);
  // Create a user-specific connection with auth token
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: user.token.access },
  };
  // 2. Create an article as the registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {},
    );
  typia.assert(article);
  // 3. Create a comment on the article as the registered user
  const comment =
    await generate_random_discussion_board_registered_user_comments_create(
      userConnection,
      {
        body: {
          discussionBoardArticleId: article.id,
          content: "This is a test comment",
        },
      },
    );
  typia.assert(comment);
  // 4. Use a non-existent snapshotId UUID for retrieval
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // Ensure it's different from any possible real snapshot ID (which we don't have, but assume random is unique)
  // 5. Attempt to retrieve the non-existent comment snapshot
  let error: unknown = null;
  await TestValidator.error(
    "retrieving non-existent comment snapshot should fail with 404",
    async () => {
      try {
        await api.functional.discussionBoard.comments.snapshots.atSnapshot(
          userConnection,
          {
            commentId: comment.id,
            snapshotId: nonExistentSnapshotId,
          },
        );
      } catch (e) {
        error = e;
        throw e;
      }
    },
  );
  // 6. Validate that the error is HttpError with 404 status
  if (error && (error as any).status !== 404) {
    throw new Error(
      `Expected HTTP 404, but got status ${(error as any).status}`,
    );
  }
  // Confirm the original comment ID exists and is valid
  TestValidator.equals(
    "comment ID is valid",
    typeof comment.id === "string" && comment.id.length > 0,
    true,
  );
}
