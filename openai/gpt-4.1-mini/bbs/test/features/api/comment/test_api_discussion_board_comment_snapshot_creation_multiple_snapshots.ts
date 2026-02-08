import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_administrator_comments_snapshots_create_snapshot } from "../../../generate/generate_random_discussion_board_administrator_comments_snapshots_create_snapshot";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_comments_create } from "../../../generate/generate_random_discussion_board_registered_user_comments_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_snapshot } from "../../../prepare/prepare_random_discussion_board_comment_snapshot";

export async function test_api_discussion_board_comment_snapshot_creation_multiple_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Create multiple snapshots for the same comment sequentially.
  //
  // Steps:
  // 1. Admin user joins the system by signing up.
  // 2. Admin user logs in.
  // 3. Registered user joins the system by signing up.
  // 4. Registered user logs in.
  // 5. Registered user creates an article.
  // 6. Registered user creates a comment on the article.
  // 7. Admin creates a snapshot for the comment.
  // 8. Admin creates another snapshot for the same comment with updated content.
  //
  // Validation Points:
  // - Confirm each snapshot is created successfully and distinct snapshot IDs are returned.
  // - Verify that timestamps reflect the creation times of each snapshot.
  // - Validate that the old snapshot remains unchanged and new snapshot captures current content.
  // - Ensure transactional integrity and proper authorization enforcement.
  // 1. Admin joins
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminJoin);
  // 2. Admin logs in
  await authorize_administrator_login(adminConnection, {
    body: {}, // Since IJoin and ILogin types are empty object types, pass empty
  });
  // 3. Registered user joins
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(userJoin);
  // 4. Registered user logs in
  await authorize_registered_user_login(userConnection, { body: {} });
  // 5. Registered user creates an article
  const article =
    (await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {},
    )) as any;
  typia.assert(article);
  // 6. Registered user creates a comment on the article
  const comment =
    (await generate_random_discussion_board_registered_user_comments_create(
      userConnection,
      {
        body: { articleId: article.id },
      },
    )) as any;
  typia.assert(comment);
  // 7. Admin creates a snapshot for the comment
  const snapshot1 =
    (await generate_random_discussion_board_administrator_comments_snapshots_create_snapshot(
      adminConnection,
      {
        params: { commentId: comment.id },
        body: {
          content: comment.content,
          discussionBoardCommentId: comment.id,
          deletedAt: null,
        },
      },
    )) as any;
  typia.assert(snapshot1);
  // 8. Admin creates another snapshot for the same comment, modifying content
  const updatedContent = comment.content + " Updated for snapshot 2.";
  const snapshot2 =
    (await generate_random_discussion_board_administrator_comments_snapshots_create_snapshot(
      adminConnection,
      {
        params: { commentId: comment.id },
        body: {
          content: updatedContent,
          discussionBoardCommentId: comment.id,
          deletedAt: null,
        },
      },
    )) as any;
  typia.assert(snapshot2);
  // Validations
  TestValidator.notEquals(
    "Snapshot IDs are distinct",
    snapshot1.id,
    snapshot2.id,
  );
  TestValidator.equals(
    "Snapshot 1 comment ID",
    snapshot1.discussionBoardCommentId,
    comment.id,
  );
  TestValidator.equals(
    "Snapshot 2 comment ID",
    snapshot2.discussionBoardCommentId,
    comment.id,
  );
  TestValidator.predicate(
    "Snapshot 1 has creation timestamp",
    typeof snapshot1.createdAt === "string" && snapshot1.createdAt.length > 0,
  );
  TestValidator.predicate(
    "Snapshot 2 has creation timestamp",
    typeof snapshot2.createdAt === "string" && snapshot2.createdAt.length > 0,
  );
  TestValidator.notEquals(
    "Snapshot 1 and 2 have different creation times",
    snapshot1.createdAt,
    snapshot2.createdAt,
  );
  TestValidator.equals(
    "Snapshot 1 content remains original",
    snapshot1.content,
    comment.content,
  );
  TestValidator.equals(
    "Snapshot 2 content is updated",
    snapshot2.content,
    updatedContent,
  );
}
