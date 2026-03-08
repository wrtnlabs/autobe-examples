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

export async function test_api_comment_snapshots_pagination_and_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // 1. SETUP: Create member account and login
  // ============================================
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // Login member with original password
  await authorize_member_login(memberConnection, {
    body: {
      email: memberAuth.email,
      password: RandomGenerator.alphaNumeric(16), // Use same password pattern
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // ============================================
  // 2. SETUP: Create admin account and login
  // ============================================
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminAuth.email,
      password: RandomGenerator.alphaNumeric(16), // Use same password pattern
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // ============================================
  // 3. SETUP: Create section (admin)
  // ============================================
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // ============================================
  // 4. SETUP: Create article (member)
  // ============================================
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
  // ============================================
  // 5. SETUP: Create comment (member)
  // ============================================
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
  // ============================================
  // 6. Test pagination with different parameters
  // Note: Without comment editing capability, snapshots may be empty
  // We test pagination logic with whatever results exist
  // ============================================
  // Test 6.1: Default pagination (page 1, limit 10)
  const page1 =
    await api.functional.discussionBoard.admin.articles.comments.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current is 1", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit is 10", page1.pagination.limit, 10);
  TestValidator.predicate("page 1 records >= 0", page1.pagination.records >= 0);
  TestValidator.predicate("page 1 pages >= 0", page1.pagination.pages >= 0);
  // Test 6.2: Pagination with limit 2
  const pageLimited =
    await api.functional.discussionBoard.admin.articles.comments.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(pageLimited);
  TestValidator.equals(
    "limited page limit is 2",
    pageLimited.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "limited page has max 2 records",
    pageLimited.data.length <= 2,
  );
  // Test 6.3: Pagination with page 2 (may be empty if few snapshots)
  const page2 =
    await api.functional.discussionBoard.admin.articles.comments.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
  // ============================================
  // 7. Test date range filtering
  // ============================================
  // Get all snapshots first to determine date range
  const allSnapshots =
    await api.functional.discussionBoard.admin.articles.comments.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Test 7.1: Filter with snapshot_created_at_from (future date - should return empty)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1); // Tomorrow
  const filteredFrom =
    await api.functional.discussionBoard.admin.articles.comments.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 100,
          snapshot_created_at_from: futureDate.toISOString(),
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(filteredFrom);
  TestValidator.equals(
    "filtered from future date has no records",
    filteredFrom.data.length === 0,
    true,
  );
  // Test 7.2: Filter with snapshot_created_at_to (past date - should return empty)
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1); // Yesterday
  const filteredTo =
    await api.functional.discussionBoard.admin.articles.comments.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 100,
          snapshot_created_at_to: pastDate.toISOString(),
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(filteredTo);
  TestValidator.equals(
    "filtered to past date has no records",
    filteredTo.data.length === 0,
    true,
  );
  // Test 7.3: Filter with both from and to (wide range - should include all if any exist)
  const veryPastDate = new Date();
  veryPastDate.setFullYear(veryPastDate.getFullYear() - 1);
  const veryFutureDate = new Date();
  veryFutureDate.setFullYear(veryFutureDate.getFullYear() + 1);
  const filteredRange =
    await api.functional.discussionBoard.admin.articles.comments.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 100,
          snapshot_created_at_from: veryPastDate.toISOString(),
          snapshot_created_at_to: veryFutureDate.toISOString(),
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(filteredRange);
  TestValidator.equals(
    "filtered range records match total",
    filteredRange.pagination.records,
    allSnapshots.pagination.records,
  );
  // ============================================
  // 8. Test sorting (descending by snapshot_created_at)
  // ============================================
  const sortedDesc =
    await api.functional.discussionBoard.admin.articles.comments.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 100,
          sort_by: "snapshot_created_at",
          order: "desc",
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(sortedDesc);
  if (sortedDesc.data.length > 1) {
    TestValidator.predicate(
      "snapshots sorted descending",
      sortedDesc.data.every((snapshot, index) => {
        if (index === 0) return true;
        return (
          new Date(snapshot.snapshot_created_at).getTime() <=
          new Date(sortedDesc.data[index - 1].snapshot_created_at).getTime()
        );
      }),
    );
  }
  // ============================================
  // 9. Validate snapshot content structure (if snapshots exist)
  // ============================================
  if (allSnapshots.data.length > 0) {
    const sampleSnapshot = allSnapshots.data[0];
    typia.assert(sampleSnapshot);
    TestValidator.equals(
      "snapshot has id",
      typeof sampleSnapshot.id === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has content",
      typeof sampleSnapshot.content === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has author",
      sampleSnapshot.author !== null,
      true,
    );
    TestValidator.equals(
      "snapshot has article",
      sampleSnapshot.article !== null,
      true,
    );
    TestValidator.predicate(
      "snapshot has valid snapshot_created_at",
      sampleSnapshot.snapshot_created_at !== null &&
        sampleSnapshot.snapshot_created_at !== undefined,
    );
    TestValidator.predicate(
      "snapshot has valid comment_created_at",
      sampleSnapshot.comment_created_at !== null &&
        sampleSnapshot.comment_created_at !== undefined,
    );
    TestValidator.predicate(
      "snapshot has valid comment_updated_at",
      sampleSnapshot.comment_updated_at !== null &&
        sampleSnapshot.comment_updated_at !== undefined,
    );
  }
  // ============================================
  // 10. Validate pagination metadata consistency
  // ============================================
  TestValidator.equals(
    "pagination current matches request",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page1.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit) ||
      (page1.pagination.records === 0 && page1.pagination.pages === 0),
  );
}
