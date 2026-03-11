import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_details_link_and_image_types(
  connection: api.IConnection,
): Promise<void> {
  // Generate expected link post data structure for validation
  const linkPostData: IRedditPlatformPost = typia.random<
    IRedditPlatformPost & {
      post_type: "LINK";
    }
  >();
  typia.assert(linkPostData);
  // Generate expected image post data structure for validation
  const imagePostData: IRedditPlatformPost = typia.random<
    IRedditPlatformPost & {
      post_type: "IMAGE";
    }
  >();
  typia.assert(imagePostData);
  // Test with mock post IDs to validate response structure
  // Note: In real E2E testing, these would be actual post IDs from the database
  const linkPostId = typia.random<string & tags.Format<"uuid">>();
  const imagePostId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve link post from API
  const retrievedLinkPost = await api.functional.redditPlatform.posts.at(
    connection,
    {
      postId: linkPostId,
    },
  );
  typia.assert(retrievedLinkPost);
  // Retrieve image post from API
  const retrievedImagePost = await api.functional.redditPlatform.posts.at(
    connection,
    {
      postId: imagePostId,
    },
  );
  typia.assert(retrievedImagePost);
  // Validate common fields for both post types
  TestValidator.equals(
    "link post has valid ID",
    retrievedLinkPost.id,
    linkPostId,
  );
  TestValidator.equals(
    "image post has valid ID",
    retrievedImagePost.id,
    imagePostId,
  );
  TestValidator.predicate(
    "link post has valid vote score",
    retrievedLinkPost.vote_score >= -2147483648 &&
      retrievedLinkPost.vote_score <= 2147483647,
  );
  TestValidator.predicate(
    "image post has valid vote score",
    retrievedImagePost.vote_score >= -2147483648 &&
      retrievedImagePost.vote_score <= 2147483647,
  );
  TestValidator.predicate(
    "link post has valid comment count",
    retrievedLinkPost.comment_count >= 0 &&
      retrievedLinkPost.comment_count <= 2147483647,
  );
  TestValidator.predicate(
    "image post has valid comment count",
    retrievedImagePost.comment_count >= 0 &&
      retrievedImagePost.comment_count <= 2147483647,
  );
  // Validate author information
  TestValidator.notEquals(
    "link post author username exists",
    retrievedLinkPost.author.username,
    "",
  );
  TestValidator.notEquals(
    "image post author username exists",
    retrievedImagePost.author.username,
    "",
  );
  TestValidator.notEquals(
    "link post author display name exists",
    retrievedLinkPost.author.display_name,
    "",
  );
  TestValidator.notEquals(
    "image post author display name exists",
    retrievedImagePost.author.display_name,
    "",
  );
  // Validate community information
  TestValidator.notEquals(
    "link post community name exists",
    retrievedLinkPost.community.name,
    "",
  );
  TestValidator.notEquals(
    "image post community name exists",
    retrievedImagePost.community.name,
    "",
  );
  TestValidator.predicate(
    "link post community subscriber count valid",
    retrievedLinkPost.community.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "image post community subscriber count valid",
    retrievedImagePost.community.subscriber_count >= 0,
  );
  // Validate post type specific fields for link post
  if (retrievedLinkPost.post_type === "LINK") {
    TestValidator.notEquals("link post url exists", retrievedLinkPost.url, "");
    TestValidator.equals(
      "link post content is null",
      retrievedLinkPost.content,
      null,
    );
    TestValidator.equals(
      "link post image_url is null",
      retrievedLinkPost.image_url,
      null,
    );
  }
  // Validate post type specific fields for image post
  if (retrievedImagePost.post_type === "IMAGE") {
    TestValidator.notEquals(
      "image post image_url exists",
      retrievedImagePost.image_url,
      "",
    );
    TestValidator.equals(
      "image post content is null",
      retrievedImagePost.content,
      null,
    );
    TestValidator.equals(
      "image post url is null",
      retrievedImagePost.url,
      null,
    );
  }
  // Validate timestamps are properly formatted
  TestValidator.predicate(
    "link post created_at is valid",
    retrievedLinkPost.created_at !== undefined &&
      retrievedLinkPost.created_at !== null,
  );
  TestValidator.predicate(
    "link post updated_at is valid",
    retrievedLinkPost.updated_at !== undefined &&
      retrievedLinkPost.updated_at !== null,
  );
  TestValidator.predicate(
    "image post created_at is valid",
    retrievedImagePost.created_at !== undefined &&
      retrievedImagePost.created_at !== null,
  );
  TestValidator.predicate(
    "image post updated_at is valid",
    retrievedImagePost.updated_at !== undefined &&
      retrievedImagePost.updated_at !== null,
  );
  // Validate arrays are properly populated
  TestValidator.predicate(
    "link post votes array exists",
    Array.isArray(retrievedLinkPost.votes),
  );
  TestValidator.predicate(
    "link post comments array exists",
    Array.isArray(retrievedLinkPost.comments),
  );
  TestValidator.predicate(
    "link post snapshots array exists",
    Array.isArray(retrievedLinkPost.snapshots),
  );
  TestValidator.predicate(
    "link post images array exists",
    Array.isArray(retrievedLinkPost.images),
  );
  TestValidator.predicate(
    "link post engagement stats array exists",
    Array.isArray(retrievedLinkPost.engagement_stats),
  );
  TestValidator.predicate(
    "image post votes array exists",
    Array.isArray(retrievedImagePost.votes),
  );
  TestValidator.predicate(
    "image post comments array exists",
    Array.isArray(retrievedImagePost.comments),
  );
  TestValidator.predicate(
    "image post snapshots array exists",
    Array.isArray(retrievedImagePost.snapshots),
  );
  TestValidator.predicate(
    "image post images array exists",
    Array.isArray(retrievedImagePost.images),
  );
  TestValidator.predicate(
    "image post engagement stats array exists",
    Array.isArray(retrievedImagePost.engagement_stats),
  );
}
// Helper functions for domain extraction (if needed)
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return "";
  }
}
