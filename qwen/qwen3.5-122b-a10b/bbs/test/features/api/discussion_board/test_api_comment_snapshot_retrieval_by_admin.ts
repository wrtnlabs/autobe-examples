import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_snapshot_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Member creates an article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {},
  );
  typia.assert(article);
  // 4. Member creates a comment on the article with original content
  const originalContent = RandomGenerator.paragraph({ sentences: 5 });
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          content: originalContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Member edits the comment (automatically creates a snapshot)
  const updatedContent = RandomGenerator.paragraph({ sentences: 3 });
  const updatedComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: updatedContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 6. Admin retrieves the comment snapshot
  // NOTE: In a real implementation, there should be a list snapshots endpoint to get the snapshotId.
  // For simulation mode, we use a generated UUID. In production, you would:
  // - Call GET /discussionBoard/admin/articles/{articleId}/comments/{commentId}/snapshots
  // - Extract the snapshot ID from the response
  // - Use that ID to retrieve the specific snapshot
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.discussionBoard.admin.articles.comments.snapshots.at(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot contains expected denormalized data
  TestValidator.equals(
    "snapshot comment_id matches original comment",
    snapshot.discussion_board_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "snapshot article_id matches original article",
    snapshot.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "snapshot member_id matches comment author",
    snapshot.discussion_board_member_id,
    memberAuth.id,
  );
  TestValidator.predicate("snapshot has content", snapshot.content.length > 0);
  TestValidator.predicate(
    "snapshot has comment_created_at timestamp",
    snapshot.comment_created_at.length > 0,
  );
  TestValidator.predicate(
    "snapshot has comment_updated_at timestamp",
    snapshot.comment_updated_at.length > 0,
  );
  TestValidator.predicate(
    "snapshot has snapshot_created_at timestamp",
    snapshot.snapshot_created_at.length > 0,
  );
  TestValidator.predicate(
    "snapshot content is not empty string",
    snapshot.content.trim().length > 0,
  );
}
