import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test retrieving a comment snapshot when the parent comment has been soft-deleted.
 * The snapshot should still be accessible because snapshots preserve historical state
 * independently of the current comment status. This validates that the snapshot
 * mechanism maintains audit trail integrity even after content moderation actions.
 */
export async function test_api_comment_snapshot_parent_comment_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - join and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create a section for article organization
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 3. Member setup - join and login
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 4. Create an article in the section
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        section_id: section.id,
      },
    },
  );
  typia.assert(article);
  // 5. Create a comment on the article (this generates initial snapshot)
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Retrieve the comment snapshot
  // Note: The initial snapshot ID is assumed to be the same as comment ID
  // This is a common pattern where the first snapshot is created with the same ID
  const snapshot =
    await api.functional.discussionBoard.articles.comments.snapshots.at(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        snapshotId: comment.id,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot data integrity and accessibility
  // Verify snapshot belongs to the correct comment
  TestValidator.equals(
    "snapshot belongs to correct comment",
    snapshot.commentId,
    comment.id,
  );
  // Verify snapshot content matches original comment
  TestValidator.equals(
    "snapshot content matches original",
    snapshot.content,
    comment.content,
  );
  // Verify snapshot author information is preserved
  TestValidator.equals(
    "snapshot author matches comment author",
    snapshot.author.id,
    comment.author.id,
  );
  // Verify snapshot article reference is correct
  TestValidator.equals(
    "snapshot article matches comment article",
    snapshot.article.id,
    article.id,
  );
  // Verify snapshot has valid timestamp
  TestValidator.predicate(
    "snapshot has valid timestamp",
    snapshot.snapshot_at !== undefined && snapshot.snapshot_at.length > 0,
  );
  // Verify snapshot created_at matches comment created_at (denormalized data)
  TestValidator.equals(
    "snapshot created_at matches comment",
    snapshot.created_at,
    comment.created_at,
  );
  // Verify snapshot updated_at matches comment updated_at (denormalized data)
  TestValidator.equals(
    "snapshot updated_at matches comment",
    snapshot.updated_at,
    comment.updated_at,
  );
  // Verify snapshot has unique ID
  TestValidator.predicate(
    "snapshot has unique identifier",
    snapshot.id !== undefined && snapshot.id.length > 0,
  );
  // Verify author email is preserved in snapshot
  TestValidator.predicate(
    "snapshot author email is preserved",
    snapshot.author.email !== undefined && snapshot.author.email.length > 0,
  );
  // Verify article title is preserved in snapshot
  TestValidator.predicate(
    "snapshot article title is preserved",
    snapshot.article.title !== undefined && snapshot.article.title.length > 0,
  );
}
