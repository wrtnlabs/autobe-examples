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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentSnapshot";
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

export async function test_api_comment_snapshots_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test comment snapshots date range filtering.
   * 1. Administrator joins and logs in
   * 2. Member joins and logs in
   * 3. Administrator creates a section
   * 4. Member creates an article
   * 5. Member creates multiple comments at different times
   * 6. Test snapshot filtering with date range parameters
   */
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "http://localhost",
      referrer: "http://localhost",
    },
  });
  // 2. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
      href: "http://localhost",
      referrer: "http://localhost",
    },
  });
  // 3. Create section
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: "Test Section",
          description: "Section for testing comment snapshots",
        },
      },
    );
  typia.assert(section);
  // 4. Create article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: "Test Article for Snapshots",
        content: "This article is used to test comment snapshot filtering.",
        section_id: section.id,
      },
    },
  );
  typia.assert(article);
  // 5. Create first comment (snapshot 1)
  const comment1 =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          content: "First comment content",
        },
      },
    );
  typia.assert(comment1);
  // Capture the first snapshot time
  const firstSnapshotTime = new Date(comment1.created_at);
  // Wait briefly to ensure time difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 6. Create second comment (snapshot 2)
  const comment2 =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          content: "Second comment content",
        },
      },
    );
  typia.assert(comment2);
  // Capture the second snapshot time
  const secondSnapshotTime = new Date(comment2.created_at);
  // Wait briefly again
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 7. Create third comment (snapshot 3)
  const comment3 =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          content: "Third comment content",
        },
      },
    );
  typia.assert(comment3);
  // Capture the third snapshot time
  const thirdSnapshotTime = new Date(comment3.created_at);
  // 8. Test date range filtering on first comment's snapshots
  // Request snapshots from before first comment to after first comment
  const snapshotsInRange =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment1.id,
        body: {
          snapshot_at_from: firstSnapshotTime.toISOString(),
          snapshot_at_to: thirdSnapshotTime.toISOString(),
        },
      },
    );
  typia.assert(snapshotsInRange);
  // Validate that we got snapshots within the range
  TestValidator.predicate(
    "snapshots in range should not be empty",
    snapshotsInRange.data.length > 0,
  );
  // All snapshots should be within the date range
  await ArrayUtil.asyncForEach(snapshotsInRange.data, async (snapshot) => {
    const snapshotTime = new Date(snapshot.snapshot_at);
    TestValidator.predicate(
      `snapshot ${snapshot.id} should be >= snapshot_at_from`,
      snapshotTime >= firstSnapshotTime,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} should be <= snapshot_at_to`,
      snapshotTime <= thirdSnapshotTime,
    );
  });
  // 9. Test filtering with narrow range (only first comment's snapshots)
  const narrowRangeEnd = new Date(
    firstSnapshotTime.getTime() + 5000,
  ).toISOString();
  const snapshotsNarrowRange =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment1.id,
        body: {
          snapshot_at_from: firstSnapshotTime.toISOString(),
          snapshot_at_to: narrowRangeEnd,
        },
      },
    );
  typia.assert(snapshotsNarrowRange);
  // Validate narrow range results
  TestValidator.predicate(
    "narrow range should return snapshots",
    snapshotsNarrowRange.data.length > 0,
  );
  // 10. Test filtering with range that excludes all snapshots (should return empty)
  const futureRangeStart = new Date(
    thirdSnapshotTime.getTime() + 10000,
  ).toISOString();
  const futureRangeEnd = new Date(
    thirdSnapshotTime.getTime() + 20000,
  ).toISOString();
  const snapshotsFutureRange =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment1.id,
        body: {
          snapshot_at_from: futureRangeStart,
          snapshot_at_to: futureRangeEnd,
        },
      },
    );
  typia.assert(snapshotsFutureRange);
  // Future range should return empty
  TestValidator.equals(
    "future range should return no snapshots",
    snapshotsFutureRange.data.length,
    0,
  );
  // 11. Test boundary condition: snapshot exactly at from timestamp
  const exactBoundarySnapshots =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment1.id,
        body: {
          snapshot_at_from: firstSnapshotTime.toISOString(),
          snapshot_at_to: firstSnapshotTime.toISOString(),
        },
      },
    );
  typia.assert(exactBoundarySnapshots);
  // Should include snapshot at exact boundary
  TestValidator.predicate(
    "boundary condition should include snapshot at exact timestamp",
    exactBoundarySnapshots.data.some(
      (s) => s.snapshot_at === firstSnapshotTime.toISOString(),
    ),
  );
}