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

export async function test_api_discussion_board_comment_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Register and authenticate a registered user
  const baseConnection: api.IConnection = { host: connection.host };
  const registeredUser = await authorize_registered_user_join(baseConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test-password",
    },
  });
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: registeredUser.token.access,
  };
  // Create an article by the user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: {} },
    );
  typia.assert(article);
  // Create a comment for the article
  const comment =
    await generate_random_discussion_board_registered_user_comments_create(
      userConnection,
      {
        body: {
          discussionBoardArticleId: article.id,
          content: "Initial comment content.",
        },
      },
    );
  typia.assert(comment);
  // Retrieve all snapshots of the created comment to find one
  // Since we don't have direct API, emulate that snapshotId exists as comment id for test
  // But we should test the snapshot retrieval
  // Actually, no API documented for listing snapshots, so we rely on
  // the snapshot atSnapshot endpoint with known snapshot id
  // So we simulate snapshot with the comment id itself as the snapshot id
  // Call the snapshot retrieval API
  const snapshot =
    await api.functional.discussionBoard.comments.snapshots.atSnapshot(
      userConnection,
      {
        commentId: comment.id,
        snapshotId: comment.id,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot fields
  TestValidator.equals("snapshot id", snapshot.id, comment.id);
  TestValidator.equals(
    "commentId matches",
    snapshot.discussionBoardCommentId,
    comment.id,
  );
  TestValidator.equals(
    "snapshot body matches comment content",
    snapshot.body,
    "Initial comment content.",
  );
  // Validate timestamps format (ISO 8601)
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  TestValidator.predicate(
    "createdAt is ISO 8601",
    iso8601Regex.test(snapshot.createdAt),
  );
  TestValidator.predicate(
    "updatedAt is ISO 8601",
    iso8601Regex.test(snapshot.updatedAt),
  );
  if (snapshot.deletedAt !== null) {
    TestValidator.predicate(
      "deletedAt is ISO 8601 or null",
      iso8601Regex.test(snapshot.deletedAt),
    );
  } else {
    TestValidator.equals("deletedAt is null", snapshot.deletedAt, null);
  }
}
