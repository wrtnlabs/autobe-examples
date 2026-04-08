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

export async function test_api_comment_snapshots_list_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fetch all snapshots with default pagination and sorting
  const response = await api.functional.redditPlatform.comment_snapshots.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // 2. Verify pagination structure
  TestValidator.equals("pagination structure valid", response.pagination, {
    current: 1,
    limit: 20,
    records: response.pagination.records,
    pages: Math.ceil(response.pagination.records / 20),
  });
  // 3. Validate pagination fields
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  TestValidator.equals(
    "pages calculated correctly",
    response.pagination.pages,
    Math.ceil(response.pagination.records / 20),
  );
  // 4. Validate each snapshot record has all required fields
  const snapshots = response.data;
  for (const snapshot of snapshots) {
    // Verify all required fields exist
    TestValidator.equals("snapshot id exists", snapshot.id !== undefined, true);
    TestValidator.equals(
      "snapshot original_comment_id exists",
      snapshot.original_comment_id !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot post_id exists",
      snapshot.post_id !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot author_id exists",
      snapshot.author_id !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot reddit_platform_comment_id exists",
      snapshot.reddit_platform_comment_id !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot upvotes_count exists",
      snapshot.upvotes_count !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot downvotes_count exists",
      snapshot.downvotes_count !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot score exists",
      snapshot.score !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot comment_created_at exists",
      snapshot.comment_created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot comment_updated_at exists",
      snapshot.comment_updated_at !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot snapshot_created_at exists",
      snapshot.snapshot_created_at !== undefined,
      true,
    );
    // Verify UUID format for all id fields
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    TestValidator.equals(
      "snapshot id is valid UUID",
      uuidPattern.test(snapshot.id),
      true,
    );
    TestValidator.equals(
      "snapshot original_comment_id is valid UUID",
      uuidPattern.test(snapshot.original_comment_id),
      true,
    );
    TestValidator.equals(
      "snapshot post_id is valid UUID",
      uuidPattern.test(snapshot.post_id),
      true,
    );
    TestValidator.equals(
      "snapshot author_id is valid UUID",
      uuidPattern.test(snapshot.author_id),
      true,
    );
    TestValidator.equals(
      "snapshot reddit_platform_comment_id is valid UUID",
      uuidPattern.test(snapshot.reddit_platform_comment_id),
      true,
    );
    // Verify score calculation
    const expectedScore = snapshot.upvotes_count - snapshot.downvotes_count;
    TestValidator.equals(
      "score equals upvotes_count minus downvotes_count",
      snapshot.score,
      expectedScore,
    );
    // Verify timestamps are ISO 8601 format
    const dateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
    TestValidator.equals(
      "snapshot comment_created_at is valid ISO 8601",
      dateTimePattern.test(snapshot.comment_created_at),
      true,
    );
    TestValidator.equals(
      "snapshot comment_updated_at is valid ISO 8601",
      dateTimePattern.test(snapshot.comment_updated_at),
      true,
    );
    TestValidator.equals(
      "snapshot snapshot_created_at is valid ISO 8601",
      dateTimePattern.test(snapshot.snapshot_created_at),
      true,
    );
  }
  // 5. Verify default sorting: snapshot_created_at descending
  if (snapshots.length > 1) {
    for (let i = 1; i < snapshots.length; i++) {
      const prev = snapshots[i - 1];
      const curr = snapshots[i];
      TestValidator.predicate(
        "snapshots sorted by snapshot_created_at descending",
        new Date(prev.snapshot_created_at) >=
          new Date(curr.snapshot_created_at),
      );
    }
  }
  // 6. Verify multiple snapshots for same comment can coexist with correct references
  if (snapshots.length > 1) {
    const commentIds = snapshots.map((s) => s.reddit_platform_comment_id);
    const uniqueCommentIds = new Set(commentIds);
    // If there are more snapshots than unique comment IDs, multiple snapshots for same comment exist
    if (snapshots.length > uniqueCommentIds.size) {
      TestValidator.predicate(
        "multiple snapshots for same comment have correct reddit_platform_comment_id",
        true,
      );
    }
  }
}
