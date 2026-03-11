import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
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
 * Test comment snapshot date range filtering functionality.
 *
 * This test verifies that administrators can filter comment edit history snapshots
 * by creation date range using created_at_from and created_at_to parameters.
 *
 * Test flow:
 * 1. Admin joins and authenticates
 * 2. Member joins and authenticates
 * 3. Admin creates a section
 * 4. Member creates an article in the section
 * 5. Member creates a comment on the article
 * 6. Query snapshots with various date range filters
 * 7. Validates filtering returns correct subsets of snapshots
 */
export async function test_api_comment_snapshot_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Member setup - join and authenticate
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
  // 3. Admin creates a section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 3,
        }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 4. Member creates an article in the section
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 5,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        sectionId: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Member creates a comment on the article
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Query snapshots with created_at_from filter
  const fromTimestamp = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
  const snapshotsFrom =
    await api.functional.discussionBoard.admin.articles.comments.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          created_at_from: fromTimestamp,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsFrom);
  // Validate from filter results
  TestValidator.predicate("from filter - all snapshots after timestamp", () =>
    snapshotsFrom.data.every(
      (snapshot) => snapshot.created_at >= fromTimestamp,
    ),
  );
  TestValidator.equals(
    "from filter - pagination current",
    snapshotsFrom.pagination.current,
    1,
  );
  TestValidator.predicate(
    "from filter - limit respected",
    () => snapshotsFrom.data.length <= (snapshotsFrom.pagination.limit ?? 20),
  );
  // 7. Query snapshots with created_at_to filter
  const toTimestamp = new Date().toISOString();
  const snapshotsTo =
    await api.functional.discussionBoard.admin.articles.comments.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          created_at_to: toTimestamp,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsTo);
  // Validate to filter results
  TestValidator.predicate("to filter - all snapshots before timestamp", () =>
    snapshotsTo.data.every((snapshot) => snapshot.created_at <= toTimestamp),
  );
  TestValidator.equals(
    "to filter - pagination current",
    snapshotsTo.pagination.current,
    1,
  );
  // 8. Query snapshots with both filters (date range)
  const rangeFrom = new Date(Date.now() - 120000).toISOString(); // 2 minutes ago
  const rangeTo = new Date().toISOString();
  const snapshotsRange =
    await api.functional.discussionBoard.admin.articles.comments.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          created_at_from: rangeFrom,
          created_at_to: rangeTo,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsRange);
  // Validate range filter results
  TestValidator.predicate("range filter - all snapshots within range", () =>
    snapshotsRange.data.every(
      (snapshot) =>
        snapshot.created_at >= rangeFrom && snapshot.created_at <= rangeTo,
    ),
  );
  TestValidator.equals(
    "range filter - pagination current",
    snapshotsRange.pagination.current,
    1,
  );
  // Validate snapshots are in chronological order
  TestValidator.predicate("snapshots in chronological order", () => {
    for (let i = 1; i < snapshotsRange.data.length; i++) {
      if (
        snapshotsRange.data[i].created_at <
        snapshotsRange.data[i - 1].created_at
      ) {
        return false;
      }
    }
    return true;
  });
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination records matches data length",
    () => snapshotsRange.pagination.records >= snapshotsRange.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    () => snapshotsRange.pagination.pages >= 1,
  );
  // Validate snapshot structure (business logic, not types - typia.assert already validated types)
  if (snapshotsRange.data.length > 0) {
    const firstSnapshot = snapshotsRange.data[0];
    TestValidator.predicate(
      "snapshot has content",
      () => firstSnapshot.content.length > 0,
    );
    TestValidator.predicate(
      "snapshot has author",
      () => firstSnapshot.author !== undefined,
    );
    TestValidator.predicate(
      "snapshot has article",
      () => firstSnapshot.article !== undefined,
    );
    TestValidator.predicate(
      "snapshot author has display name",
      () => firstSnapshot.author.display_name.length > 0,
    );
    TestValidator.predicate(
      "snapshot article has title",
      () => firstSnapshot.article.title.length > 0,
    );
  }
}
