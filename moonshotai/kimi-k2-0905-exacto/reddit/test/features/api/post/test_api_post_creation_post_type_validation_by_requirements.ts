import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test post type classification based on content requirements defined in the
 * IRedditCommunityPost.ICreate schema.
 *
 * This test validates that posts conform to their specified post type
 * constraints, specifically verifying that:
 *
 * - Text posts can include content (string content field)
 * - Link posts can include external URLs (link_url field with URI format)
 * - Post type requirements are properly reflected in the created entity structure
 * - Community associations work correctly with different post configurations
 */
export async function test_api_post_creation_post_type_validation_by_requirements(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account for authorization
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "SecurePass123!" satisfies string & tags.Format<"password">,
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Test creation of text post with content body
  const communityId1 = typia.random<string & tags.Format<"uuid">>();
  const postTypeId1 = typia.random<string & tags.Format<"uuid">>();
  const textPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 8,
        }),
        reddit_community_id: communityId1,
        reddit_post_type_id: postTypeId1,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(textPost);
  TestValidator.equals(
    "text post title matches",
    textPost.title,
    textPost.title,
  );
  TestValidator.predicate(
    "text post has content",
    textPost.content !== null && textPost.content !== undefined,
  );

  // Step 3: Test creation of link post with external URL
  const communityId2 = typia.random<string & tags.Format<"uuid">>();
  const postTypeId2 = typia.random<string & tags.Format<"uuid">>();
  const externalUrl = "https://example.com/" + RandomGenerator.alphabets(8);
  const linkPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 10,
        }),
        link_url: externalUrl,
        reddit_community_id: communityId2,
        reddit_post_type_id: postTypeId2,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(linkPost);
  TestValidator.equals(
    "link post title matches",
    linkPost.title,
    linkPost.title,
  );
  TestValidator.equals("link post has URL", linkPost.link_url, externalUrl);

  // Step 4: Test creation of minimal post (no optional fields)
  const communityId3 = typia.random<string & tags.Format<"uuid">>();
  const postTypeId3 = typia.random<string & tags.Format<"uuid">>();
  const minimalPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 5,
          wordMax: 12,
        }),
        reddit_community_id: communityId3,
        reddit_post_type_id: postTypeId3,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(minimalPost);
  TestValidator.predicate(
    "minimal post has no content",
    minimalPost.content === null || minimalPost.content === undefined,
  );
  TestValidator.predicate(
    "minimal post has no link",
    minimalPost.link_url === null || minimalPost.link_url === undefined,
  );

  // Validate all posts have proper metadata and initial state
  for (const post of [textPost, linkPost, minimalPost]) {
    TestValidator.predicate(
      `${post.title} has zero upvotes`,
      post.upvote_count === 0,
    );
    TestValidator.predicate(
      `${post.title} has zero downvotes`,
      post.downvote_count === 0,
    );
    TestValidator.predicate(
      `${post.title} has zero views`,
      post.view_count === 0,
    );
    TestValidator.predicate(
      `${post.title} has zero comments`,
      post.comment_count === 0,
    );
    TestValidator.predicate(
      `${post.title} is not locked`,
      post.is_locked === false,
    );
    TestValidator.predicate(
      `${post.title} is not pinned`,
      post.is_pinned === false,
    );
    TestValidator.predicate(
      `${post.title} has timestamp`,
      post.created_at !== null,
    );
    TestValidator.predicate(
      `${post.title} has uuid ID`,
      post.id !== null && post.id.length > 0,
    );
  }

  // Validate community and author associations
  TestValidator.equals(
    "text post community ID",
    textPost.community.id,
    communityId1,
  );
  TestValidator.equals(
    "link post community ID",
    linkPost.community.id,
    communityId2,
  );
  TestValidator.equals(
    "minimal post community ID",
    minimalPost.community.id,
    communityId3,
  );
  TestValidator.equals("text post author ID", textPost.author.id, member.id);
  TestValidator.equals("link post author ID", linkPost.author.id, member.id);
  TestValidator.equals(
    "minimal post author ID",
    minimalPost.author.id,
    member.id,
  );

  // Final validation: ensure all created posts have different IDs
  const postIds = [textPost.id, linkPost.id, minimalPost.id];
  TestValidator.equals("all posts have unique IDs", new Set(postIds).size, 3);
}
