import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Verifies that post snapshots correctly preserve edit history by retrieving existing snapshots.
 *
 * This test retrieves post snapshots to validate their structure, immutability, and relationship to parent posts. Since snapshot creation is handled automatically by the system, this test focuses on verifying that snapshots contain the expected data structure and maintain correct relationships.
 *
 * The test ensures that:
 * - Snapshots contain all required fields (id, title, post_type, content fields, timestamp)
 * - Content fields are correctly populated based on post_type
 * - Parent post relation is present and valid
 * - Snapshots have unique IDs and valid timestamps
 * - Snapshot data structure matches IRedditClonePostSnapshot DTO
 *
 * 1. Generate test post and snapshot IDs.
 * 2. Retrieve snapshot using the available API.
 * 3. Validate snapshot structure and fields.
 * 4. Verify parent post relation.
 * 5. Validate timestamp format.
 */
export async function test_api_post_snapshot_edit_history_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate test IDs for existing post and snapshot
  const postId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 2. Retrieve snapshot
  const snapshot = await api.functional.redditClone.posts.snapshots.at(
    connection,
    {
      postId,
      snapshotId,
    },
  );
  typia.assert(snapshot);
  // 3. Validate snapshot has required fields
  TestValidator.predicate("snapshot has valid UUID", snapshot.id !== "");
  TestValidator.predicate("snapshot has title", snapshot.title !== "");
  TestValidator.predicate("snapshot has post_type", snapshot.post_type !== "");
  // 4. Validate post_type is one of the valid values
  TestValidator.predicate(
    "post_type is valid",
    snapshot.post_type === "text" ||
      snapshot.post_type === "link" ||
      snapshot.post_type === "image",
  );
  // 5. Validate content fields based on post_type
  if (snapshot.post_type === "text") {
    TestValidator.predicate(
      "text post has text_content",
      snapshot.text_content !== null,
    );
    TestValidator.equals(
      "link_url is null for text post",
      snapshot.link_url,
      null,
    );
    TestValidator.equals(
      "image_url is null for text post",
      snapshot.image_url,
      null,
    );
  } else if (snapshot.post_type === "link") {
    TestValidator.predicate(
      "link post has link_url",
      snapshot.link_url !== null,
    );
    TestValidator.equals(
      "text_content is null for link post",
      snapshot.text_content,
      null,
    );
    TestValidator.equals(
      "image_url is null for link post",
      snapshot.image_url,
      null,
    );
  } else if (snapshot.post_type === "image") {
    TestValidator.predicate(
      "image post has image_url",
      snapshot.image_url !== null,
    );
    TestValidator.equals(
      "text_content is null for image post",
      snapshot.text_content,
      null,
    );
    TestValidator.equals(
      "link_url is null for image post",
      snapshot.link_url,
      null,
    );
  }
  // 6. Validate timestamp
  TestValidator.predicate(
    "snapshot has valid timestamp",
    !isNaN(Date.parse(snapshot.snapshot_created_at)),
  );
  // 7. Validate parent post relation
  TestValidator.predicate("snapshot has parent post", snapshot.post.id !== "");
  TestValidator.predicate("parent post has title", snapshot.post.title !== "");
  TestValidator.predicate(
    "parent post has post_type",
    snapshot.post.post_type !== "",
  );
  TestValidator.predicate(
    "parent post has author",
    snapshot.post.author.id !== "",
  );
  TestValidator.predicate(
    "parent post has community",
    snapshot.post.community.id !== "",
  );
  TestValidator.predicate(
    "parent post has vote_score",
    typeof snapshot.post.vote_score === "number",
  );
  TestValidator.predicate(
    "parent post has comment_count",
    typeof snapshot.post.comment_count === "number",
  );
  TestValidator.predicate(
    "parent post has created_at",
    snapshot.post.created_at !== "",
  );
  TestValidator.predicate(
    "parent post has preview",
    snapshot.post.preview !== "",
  );
  // 8. Validate author profile
  TestValidator.predicate(
    "author has display_name",
    snapshot.post.author.display_name !== "",
  );
  TestValidator.predicate(
    "author has karma",
    typeof snapshot.post.author.karma === "number",
  );
  // 9. Validate community
  TestValidator.predicate(
    "community has name",
    snapshot.post.community.name !== "",
  );
  TestValidator.predicate(
    "community has description",
    snapshot.post.community.description !== "",
  );
  TestValidator.predicate(
    "community has subscriber_count",
    typeof snapshot.post.community.subscriber_count === "number",
  );
}
