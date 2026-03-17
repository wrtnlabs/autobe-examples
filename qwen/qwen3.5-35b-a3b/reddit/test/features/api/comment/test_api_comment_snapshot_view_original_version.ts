import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentSnapshot";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_comment_snapshot_view_original_version(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate mock comment and snapshot IDs
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Retrieve the snapshot
  const snapshot = await api.functional.redditCommunity.comments.snapshots.at(
    connection,
    {
      commentId,
      snapshotId,
    },
  );
  typia.assert(snapshot);
  // 3. Validate version is 1 (original content)
  TestValidator.equals("snapshot version is 1", snapshot.version, 1);
  // 4. Validate content structure
  TestValidator.equals(
    "content is string type",
    typeof snapshot.content === "string",
    true,
  );
  TestValidator.predicate("content is non-empty", snapshot.content.length > 0);
  // 5. Validate timestamp format
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    () => !isNaN(Date.parse(snapshot.created_at)),
  );
  // 6. Validate author reference
  TestValidator.equals(
    "author has valid UUID",
    typeof snapshot.author.id === "string",
    true,
  );
  TestValidator.equals(
    "author username is non-empty",
    snapshot.author.username.length > 0,
    true,
  );
  TestValidator.predicate(
    "author created_at is valid date-time",
    () => !isNaN(Date.parse(snapshot.author.created_at)),
  );
  TestValidator.equals(
    "author has profile",
    snapshot.author.profile !== null,
    true,
  );
  if (snapshot.author.profile) {
    TestValidator.equals(
      "profile has display_name",
      snapshot.author.profile.display_name.length > 0,
      true,
    );
    TestValidator.equals(
      "profile has karma_score",
      typeof snapshot.author.profile.karma_score === "number",
      true,
    );
  }
  // 7. Validate post reference
  TestValidator.equals(
    "post has valid UUID",
    typeof snapshot.post.id === "string",
    true,
  );
  TestValidator.equals(
    "post title is non-empty",
    snapshot.post.title.length > 0,
    true,
  );
  TestValidator.equals("post has author", snapshot.post.author !== null, true);
  TestValidator.equals(
    "post has community",
    snapshot.post.community !== null,
    true,
  );
  TestValidator.equals(
    "post has valid post_type",
    ["text", "link", "image"].includes(snapshot.post.post_type),
    true,
  );
  TestValidator.predicate(
    "post created_at is valid date-time",
    () => !isNaN(Date.parse(snapshot.post.created_at)),
  );
  // 8. Validate post community
  TestValidator.equals(
    "community has valid ID",
    typeof snapshot.post.community.id === "string",
    true,
  );
  TestValidator.equals(
    "community name is non-empty",
    snapshot.post.community.name.length > 0,
    true,
  );
  TestValidator.equals(
    "community has owner",
    snapshot.post.community.owner !== null,
    true,
  );
  TestValidator.equals(
    "community subscriber_count is valid",
    typeof snapshot.post.community.subscriber_count === "number",
    true,
  );
  // 9. Validate parent comment (can be null for top-level comments)
  const parentComment = snapshot.parentComment;
  if (parentComment !== null && parentComment !== undefined) {
    TestValidator.equals(
      "parent comment has valid ID",
      typeof parentComment.id === "string",
      true,
    );
    TestValidator.equals(
      "parent comment has voteScore",
      typeof parentComment.voteScore === "number",
      true,
    );
    TestValidator.equals(
      "parent comment has author",
      parentComment.author !== null,
      true,
    );
    TestValidator.predicate(
      "parent comment created_at is valid",
      () => !isNaN(Date.parse(parentComment.createdAt)),
    );
    TestValidator.equals(
      "parent comment has replyCount",
      typeof parentComment.replyCount === "number",
      true,
    );
  } else {
    // For null parentComment, validate that it's actually null (not undefined)
    TestValidator.equals(
      "parentComment is null for top-level comment",
      parentComment, // eslint-disable-line @typescript-eslint/no-unnecessary-condition
      null,
    );
  }
  // 10. Validate denormalized references are populated
  TestValidator.equals(
    "author username is populated",
    snapshot.author.username.length > 0,
    true,
  );
  TestValidator.equals(
    "post title is populated",
    snapshot.post.title.length > 0,
    true,
  );
  // 11. Validate post author and community are non-null
  TestValidator.equals(
    "post author is non-null",
    snapshot.post.author !== null,
    true,
  );
  TestValidator.equals(
    "post community is non-null",
    snapshot.post.community !== null,
    true,
  );
}