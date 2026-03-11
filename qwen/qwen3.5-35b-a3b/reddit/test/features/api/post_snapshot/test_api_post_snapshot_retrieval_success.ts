import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate test data with proper UUID format
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Retrieve snapshot (public endpoint, no authentication required)
  const snapshot = await api.functional.redditPlatform.posts._snapshots.at(
    connection,
    {
      postId,
      snapshotId,
    },
  );
  typia.assert(snapshot);
  // 3. Validate snapshot structure with typia.assert includes:
  // - id: UUID
  // - reddit_platform_post_id: UUID
  // - author: IRedditPlatformMember.ISummary
  // - title: string (max 300)
  // - content: string | null | undefined
  // - post_type: TEXT | LINK | IMAGE
  // - url: string | null | undefined
  // - image_url: string | null | undefined
  // - vote_score: int32
  // - comment_count: int32
  // - snapshot_type: CREATE | EDIT | DELETE
  // - created_at: date-time
  // 4. Validate content fields based on post_type
  if (snapshot.post_type === "TEXT") {
    typia.assertGuard(
      snapshot.content !== null && snapshot.content !== undefined,
    );
    TestValidator.predicate(
      "TEXT post has valid content",
      snapshot.content !== null,
    );
  }
  if (snapshot.post_type === "LINK") {
    typia.assertGuard(snapshot.url !== null && snapshot.url !== undefined);
    TestValidator.predicate("LINK post has valid url", snapshot.url !== null);
  }
  if (snapshot.post_type === "IMAGE") {
    typia.assertGuard(
      snapshot.image_url !== null && snapshot.image_url !== undefined,
    );
    TestValidator.predicate(
      "IMAGE post has valid image_url",
      snapshot.image_url !== null,
    );
  }
  // 5. Validate snapshot_type is one of the allowed values
  TestValidator.predicate(
    "snapshot_type is valid (CREATE/EDIT/DELETE)",
    ["CREATE", "EDIT", "DELETE"].includes(snapshot.snapshot_type),
  );
  // 6. Validate post_type is one of the allowed values
  TestValidator.predicate(
    "post_type is valid (TEXT/LINK/IMAGE)",
    ["TEXT", "LINK", "IMAGE"].includes(snapshot.post_type),
  );
  // 7. Validate author summary structure (all fields present after typia.assert)
  TestValidator.predicate(
    "author has valid karma_score",
    snapshot.author.karma_score >= 0,
  );
  TestValidator.predicate(
    "author is_active is boolean",
    typeof snapshot.author.is_active === "boolean",
  );
  TestValidator.predicate(
    "author has valid username",
    snapshot.author.username.length > 0,
  );
  TestValidator.predicate(
    "author has valid display_name",
    snapshot.author.display_name.length > 0,
  );
  TestValidator.predicate(
    "author created_at is valid date-time",
    snapshot.author.created_at !== undefined,
  );
}
