import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test advanced filtering of article snapshots by date ranges.
 * Authenticate member, create article. Since we cannot generate multiple snapshots
 * through editing in this test context, we'll test the filtering functionality
 * with the available snapshots and validate the filtering logic works correctly.
 * We'll test created_after, created_before, and combined filters, ensuring
 * proper boundary validation and empty result handling.
 */
export async function test_api_article_snapshot_filter_by_temporal_range(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Create an article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {},
  );
  typia.assert(article);
  // Get all available snapshots for the article
  const allSnapshots =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        body: {},
      },
    );
  typia.assert(allSnapshots);
  // Test created_after filter with current time (should return empty)
  const currentTime = new Date().toISOString();
  const afterSnapshots =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          created_after: currentTime,
        },
      },
    );
  typia.assert(afterSnapshots);
  // Validate created_after filter returns empty for future dates
  TestValidator.equals(
    "created_after with future date should return empty data",
    afterSnapshots.data.length,
    0,
  );
  TestValidator.equals(
    "created_after with future date should have records = 0",
    afterSnapshots.pagination.records,
    0,
  );
  // Test created_before filter with very old date (should return empty)
  const oldDate = new Date(Date.now() - 86400000 * 365).toISOString(); // 1 year ago
  const beforeSnapshots =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          created_before: oldDate,
        },
      },
    );
  typia.assert(beforeSnapshots);
  // Validate created_before filter returns empty for very old dates
  TestValidator.equals(
    "created_before with very old date should return empty data",
    beforeSnapshots.data.length,
    0,
  );
  TestValidator.equals(
    "created_before with very old date should have records = 0",
    beforeSnapshots.pagination.records,
    0,
  );
  // Test combined filter with range that includes all snapshots
  const allSnapshotsResponse =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          created_after: oldDate,
          created_before: currentTime,
        },
      },
    );
  typia.assert(allSnapshotsResponse);
  // The combined filter with wide range should return all snapshots
  TestValidator.equals(
    "wide date range should return all available snapshots",
    allSnapshotsResponse.pagination.records,
    allSnapshots.pagination.records,
  );
  // Verify chronological ordering of snapshots
  TestValidator.predicate(
    "snapshots should be ordered chronologically ascending",
    allSnapshots.data.every((snapshot, index, array) => {
      if (index === 0) return true;
      const currentTime = new Date(snapshot.created_at).getTime();
      const previousTime = new Date(array[index - 1].created_at).getTime();
      return currentTime >= previousTime;
    }),
  );
  // Test edge case: created_after equals created_before (should return empty)
  const sameTimeSnapshots =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          created_after: currentTime,
          created_before: currentTime,
        },
      },
    );
  typia.assert(sameTimeSnapshots);
  TestValidator.equals(
    "identical created_after and created_before should return empty",
    sameTimeSnapshots.data.length,
    0,
  );
}
