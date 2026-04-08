import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommentSnapshot";
import type { IRedditPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_comment_snapshots_by_comment_history(
  connection: api.IConnection,
): Promise<void> {
  // Generate a test comment UUID to query
  const testCommentId = typia.random<string & tags.Format<"uuid">>();
  // Make request to get snapshots for this specific comment
  const output = await api.functional.redditPlatform.comment_snapshots.index(
    connection,
    {
      body: {
        reddit_platform_comment_id: testCommentId,
      } satisfies IRedditPlatformCommentSnapshot.IRequest,
    },
  );
  typia.assert(output);
  // Validate pagination structure
  TestValidator.predicate(
    "response has pagination metadata",
    () =>
      output.pagination.current > 0 &&
      output.pagination.limit > 0 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.predicate(
    "response has data array",
    () => Array.isArray(output.data) && output.data.length >= 0,
  );
  // Validate all snapshots match the queried comment ID
  for (const snapshot of output.data) {
    TestValidator.equals(
      `snapshot ${snapshot.id} has matching comment_id`,
      snapshot.reddit_platform_comment_id,
      testCommentId,
    );
    // Verify snapshot_created_at is a valid date-time
    TestValidator.predicate(
      `snapshot ${snapshot.id} has valid snapshot_created_at`,
      () => !isNaN(new Date(snapshot.snapshot_created_at).getTime()),
    );
    // Verify comment_created_at is consistent (same for all snapshots of same comment)
    TestValidator.predicate(
      `snapshot ${snapshot.id} has valid comment_created_at`,
      () => !isNaN(new Date(snapshot.comment_created_at).getTime()),
    );
    // Verify comment_updated_at is a valid date-time
    TestValidator.predicate(
      `snapshot ${snapshot.id} has valid comment_updated_at`,
      () => !isNaN(new Date(snapshot.comment_updated_at).getTime()),
    );
    // Verify vote counts are valid integers
    TestValidator.predicate(
      `snapshot ${snapshot.id} has valid upvotes_count`,
      () =>
        typeof snapshot.upvotes_count === "number" &&
        snapshot.upvotes_count >= 0,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} has valid downvotes_count`,
      () =>
        typeof snapshot.downvotes_count === "number" &&
        snapshot.downvotes_count >= 0,
    );
    // Verify score calculation (upvotes - downvotes)
    const expectedScore = snapshot.upvotes_count - snapshot.downvotes_count;
    TestValidator.equals(
      `snapshot ${snapshot.id} score calculation`,
      snapshot.score,
      expectedScore,
    );
  }
  // Validate sorting: snapshots should be sorted by snapshot_created_at descending
  if (output.data.length > 1) {
    for (let i = 1; i < output.data.length; i++) {
      const prevDate = new Date(output.data[i - 1].snapshot_created_at);
      const currDate = new Date(output.data[i].snapshot_created_at);
      TestValidator.predicate(
        `snapshots ${i - 1} and ${i} are sorted descending by snapshot_created_at`,
        () => prevDate >= currDate,
      );
    }
  }
  // Verify comment_created_at is consistent across all snapshots
  if (output.data.length > 1) {
    const firstCreatedAt = output.data[0].comment_created_at;
    for (const snapshot of output.data) {
      TestValidator.equals(
        "comment_created_at is consistent across snapshots",
        snapshot.comment_created_at,
        firstCreatedAt,
      );
    }
  }
}
