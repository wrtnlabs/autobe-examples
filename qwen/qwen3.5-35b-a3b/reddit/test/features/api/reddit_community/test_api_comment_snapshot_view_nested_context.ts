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

export async function test_api_comment_snapshot_view_nested_context(
  connection: api.IConnection,
): Promise<void> {
  // Generate realistic test data for a comment snapshot with nested context
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Create a test snapshot representing an edited comment version 2
  const testSnapshot: IRedditCommunityCommentSnapshot = {
    id: snapshotId,
    content: "This is the edited comment content for version 2.",
    version: 2,
    created_at: new Date().toISOString(),
    comment_id: commentId,
    author: {
      id: typia.random<string & tags.Format<"uuid">>(),
      username: RandomGenerator.name(),
      created_at: new Date().toISOString(),
      profile: {
        id: typia.random<string & tags.Format<"uuid">>(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_image_url: null,
        karma_score: typia.random<number & tags.Type<"int32">>(),
        created_at: new Date().toISOString(),
      },
      karma: typia.random<number & tags.Type<"int32">>(),
    },
    post: {
      id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.paragraph({ sentences: 2 }),
      author: {
        id: typia.random<string & tags.Format<"uuid">>(),
        username: RandomGenerator.name(),
        created_at: new Date().toISOString(),
        profile: {
          id: typia.random<string & tags.Format<"uuid">>(),
          display_name: RandomGenerator.name(),
          bio: null,
          avatar_image_url: null,
          karma_score: typia.random<number & tags.Type<"int32">>(),
          created_at: new Date().toISOString(),
        },
      },
      community: {
        id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        subscriber_count: typia.random<number & tags.Type<"int32">>(),
        owner: {
          id: typia.random<string & tags.Format<"uuid">>(),
          username: RandomGenerator.name(),
          created_at: new Date().toISOString(),
          profile: {
            id: typia.random<string & tags.Format<"uuid">>(),
            display_name: RandomGenerator.name(),
            bio: null,
            avatar_image_url: null,
            karma_score: typia.random<number & tags.Type<"int32">>(),
            created_at: new Date().toISOString(),
          },
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      },
      vote_score: typia.random<number & tags.Type<"int32">>(),
      comment_count: typia.random<number & tags.Type<"int32">>(),
      created_at: new Date().toISOString(),
      post_type: "text" as "text" | "link" | "image",
      preview_content: RandomGenerator.paragraph({ sentences: 2 }),
    },
    parentComment: null, // Top-level comment snapshot
  };
  // Retrieve the snapshot via API
  const output: IRedditCommunityCommentSnapshot =
    await api.functional.redditCommunity.comments.snapshots.at(connection, {
      commentId,
      snapshotId,
    });
  typia.assert(output);
  // Validate snapshot structure and context
  TestValidator.equals("snapshot ID matches request", output.id, snapshotId);
  TestValidator.equals(
    "comment ID matches request",
    output.comment_id,
    commentId,
  );
  TestValidator.equals(
    "snapshot version is 2 (edited version)",
    output.version,
    2,
  );
  TestValidator.equals(
    "parentComment is null for top-level comment",
    output.parentComment,
    null,
  );
  TestValidator.equals(
    "snapshot has author information",
    output.author !== null,
    true,
  );
  TestValidator.equals(
    "snapshot has post information",
    output.post !== null,
    true,
  );
  TestValidator.equals(
    "author has username",
    output.author.username.length > 0,
    true,
  );
  TestValidator.equals("post has title", output.post.title.length > 0, true);
  TestValidator.equals(
    "post has community",
    output.post.community !== null,
    true,
  );
  TestValidator.equals(
    "community has name",
    output.post.community.name.length > 0,
    true,
  );
  TestValidator.equals(
    "snapshot has proper timestamp",
    output.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot has valid content",
    output.content.length > 0,
    true,
  );
}
