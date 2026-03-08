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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test administrator retrieval of comment snapshots.
 * 1. Admin creates section
 * 2. Member creates article
 * 3. Member creates comment
 * 4. Admin retrieves snapshots for comment (empty - no edits made)
 * 5. Validate pagination metadata and empty result handling
 *
 * Note: Snapshot generation requires comment editing via PATCH endpoint,
 * which is not available in the current SDK. This test validates the
 * retrieval endpoint structure and empty result handling.
 */
export async function test_api_comment_snapshots_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Login admin to get fresh session
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: RandomGenerator.alphaNumeric(16), // Use same password pattern
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. Setup member connection and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Admin creates section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminLoginConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 4. Member creates article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Member creates initial comment
  const initialContent = RandomGenerator.paragraph({ sentences: 5 });
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          content: initialContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Admin retrieves snapshots (empty - comment never edited)
  const snapshots =
    await api.functional.discussionBoard.admin.articles.comments.snapshots.index(
      adminLoginConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "snapshot_created_at",
          order: "desc",
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 7. Validate empty result handling
  TestValidator.equals("empty data array", snapshots.data.length, 0);
  TestValidator.equals("zero total records", snapshots.pagination.records, 0);
  TestValidator.equals("zero total pages", snapshots.pagination.pages, 0);
  TestValidator.equals("current page is 1", snapshots.pagination.current, 1);
  TestValidator.equals("limit matches request", snapshots.pagination.limit, 10);
  // 8. Test with date range filtering (should still be empty)
  const now = new Date();
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 24 hours ago
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 24 hours ahead
  const filteredSnapshots =
    await api.functional.discussionBoard.admin.articles.comments.snapshots.index(
      adminLoginConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
          snapshot_created_at_from: pastDate.toISOString(),
          snapshot_created_at_to: futureDate.toISOString(),
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  TestValidator.equals(
    "filtered empty data array",
    filteredSnapshots.data.length,
    0,
  );
  TestValidator.equals(
    "filtered zero total records",
    filteredSnapshots.pagination.records,
    0,
  );
  // 9. Test pagination parameters
  const page2Snapshots =
    await api.functional.discussionBoard.admin.articles.comments.snapshots.index(
      adminLoginConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(page2Snapshots);
  TestValidator.equals("page 2 current", page2Snapshots.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Snapshots.pagination.limit, 5);
  TestValidator.equals("page 2 empty data", page2Snapshots.data.length, 0);
}
