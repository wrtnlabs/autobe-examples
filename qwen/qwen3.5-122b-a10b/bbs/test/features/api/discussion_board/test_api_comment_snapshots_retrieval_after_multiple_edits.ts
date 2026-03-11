import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentSnapshot";
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

/**
 * Test that an administrator can successfully retrieve the historical snapshot trail for a comment that has been edited multiple times. This validates the core audit trail functionality for comment moderation accountability.
 *
 * Test workflow:
 * 1. Admin authenticates via join
 * 2. Admin creates a discussion article
 * 3. Member authenticates via join
 * 4. Member creates a comment on the article
 * 5. Member edits the comment twice (creating 2 snapshots)
 * 6. Admin retrieves snapshots for the comment
 * 7. Verify response contains exactly 2 snapshots in DESC order by snapshot_created_at
 * 8. Verify each snapshot contains: id, content (different for each edit), discussion_board_article_id, discussion_board_member_id, comment_created_at, comment_updated_at, snapshot_created_at
 * 9. Verify pagination metadata is correct (current page, limit, records=2, pages=1)
 *
 * Business validation points:
 * - Snapshots are automatically created on each comment edit
 * - Snapshots preserve the content at the time of each edit
 * - Snapshots are ordered newest-first for efficient audit review
 * - Denormalized data (article_id, member_id) allows efficient querying without joins
 * - All required fields are present in snapshot summaries
 */
export async function test_api_comment_snapshots_retrieval_after_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authenticates via join
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
  // 2. Admin creates a discussion article
  const article = await generate_random_discussion_board_member_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Member authenticates via join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 4. Member creates a comment on the article
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Store original comment timestamps
  const originalCreatedAt = comment.created_at;
  // 5. Member edits the comment first time (creates first snapshot)
  const firstEditContent = RandomGenerator.paragraph({ sentences: 5 });
  const firstEdit =
    await api.functional.discussionBoard.member.articles.comments.update(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: firstEditContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(firstEdit);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 6. Member edits the comment second time (creates second snapshot)
  const secondEditContent = RandomGenerator.paragraph({ sentences: 7 });
  const secondEdit =
    await api.functional.discussionBoard.member.articles.comments.update(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: secondEditContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(secondEdit);
  // 7. Admin retrieves snapshots for the comment
  const snapshots =
    await api.functional.discussionBoard.admin.articles.comments.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
          sort: "snapshot_created_at",
          order: "desc",
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 8. Verify response contains exactly 2 snapshots
  TestValidator.equals("snapshot count", snapshots.data.length, 2);
  // 9. Verify pagination metadata is correct
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshots.pagination.limit, 10);
  TestValidator.equals("pagination records", snapshots.pagination.records, 2);
  TestValidator.equals("pagination pages", snapshots.pagination.pages, 1);
  // 10. Verify snapshots are in DESC order by snapshot_created_at
  const firstSnapshot = snapshots.data[0];
  const secondSnapshot = snapshots.data[1];
  TestValidator.predicate(
    "snapshots ordered newest first",
    firstSnapshot.snapshot_created_at >= secondSnapshot.snapshot_created_at,
  );
  // 11. Verify each snapshot contains required fields with correct data
  // First snapshot (most recent edit)
  TestValidator.equals(
    "first snapshot article ID matches",
    firstSnapshot.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "first snapshot member ID matches",
    firstSnapshot.discussion_board_member_id,
    memberAuth.id,
  );
  TestValidator.equals(
    "first snapshot comment created_at matches original",
    firstSnapshot.comment_created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "first snapshot has content",
    firstSnapshot.content.length > 0,
  );
  TestValidator.predicate(
    "first snapshot snapshot_created_at is valid",
    new Date(firstSnapshot.snapshot_created_at) <= new Date(),
  );
  // Second snapshot (first edit)
  TestValidator.equals(
    "second snapshot article ID matches",
    secondSnapshot.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "second snapshot member ID matches",
    secondSnapshot.discussion_board_member_id,
    memberAuth.id,
  );
  TestValidator.equals(
    "second snapshot comment created_at matches original",
    secondSnapshot.comment_created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "second snapshot has content",
    secondSnapshot.content.length > 0,
  );
  // 12. Verify content differs between snapshots (capturing different edits)
  TestValidator.notEquals(
    "snapshot contents differ",
    firstSnapshot.content,
    secondSnapshot.content,
  );
  // 13. Verify comment_updated_at is captured in snapshots
  TestValidator.predicate(
    "first snapshot has comment_updated_at",
    firstSnapshot.comment_updated_at !== null,
  );
  TestValidator.predicate(
    "second snapshot has comment_updated_at",
    secondSnapshot.comment_updated_at !== null,
  );
}
