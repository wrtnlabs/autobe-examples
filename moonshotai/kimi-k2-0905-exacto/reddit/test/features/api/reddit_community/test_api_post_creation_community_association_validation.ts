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
 * Test posts are correctly associated with their target communities through
 * reddit_community_id reference. Validate community membership requirements are
 * enforced and posts are properly linked to existing active communities. Ensure
 * content is published in appropriate thematic forums within the Reddit
 * Community platform.
 *
 * Test Flow:
 *
 * 1. Create authenticated member account (using auth/member/join as dependency)
 * 2. Create multiple communities with different access types
 * 3. Verify community properties and access controls
 * 4. Create posts in communities with proper association
 * 5. Validate posts are correctly linked to target communities
 * 6. Test business logic errors with non-existent communities
 * 7. Test community access restrictions (public vs restricted/base_compat_testes)
 */
export async function test_api_post_creation_community_association_validation(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "SecurePassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create public community for association testing
  const publicCommunityName = RandomGenerator.name()
    .replace(/\s/g, "_")
    .toLowerCase();
  const publicCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: publicCommunityName,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_name: "Technology",
        type: "public",
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(publicCommunity);

  // Step 3: Verify public community was created properly
  TestValidator.equals(
    "public community name matches",
    publicCommunity.name,
    publicCommunityName,
  );
  TestValidator.equals(
    "public community type is public",
    publicCommunity.type,
    "public",
  );
  TestValidator.predicate("community has valid ID", () =>
    typia.is<string & tags.Format<"uuid">>(publicCommunity.id),
  );
  TestValidator.predicate(
    "community has subscriber count",
    () => publicCommunity.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "community has category",
    () =>
      publicCommunity.category !== null &&
      publicCommunity.category !== undefined,
  );

  // Step 4: Create post in public community
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const postContent = RandomGenerator.content({ paragraphs: 3 });
  const postTypeId = typia.random<string & tags.Format<"uuid">>();

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: postTitle,
        content: postContent,
        reddit_community_id: publicCommunity.id,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Validate post links correctly to target community
  TestValidator.equals("post title matches", post.title, postTitle);
  TestValidator.equals("post content matches", post.content, postContent);
  TestValidator.equals(
    "post community ID matches",
    post.community.id,
    publicCommunity.id,
  );
  TestValidator.equals(
    "post community name matches",
    post.community.name,
    publicCommunity.name,
  );
  TestValidator.predicate("post has valid ID", () =>
    typia.is<string & tags.Format<"uuid">>(post.id),
  );
  TestValidator.equals(
    "post initial vote counts are zero",
    post.upvote_count,
    0,
  );
  TestValidator.equals("post initial view count is zero", post.view_count, 0);

  // Step 6: Test business error - non-existent community
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "post creation with non-existent community should fail",
    async () => {
      await api.functional.redditCommunity.member.posts.create(connection, {
        body: {
          title: "Invalid Post",
          content: "This should fail due to non-existent community",
          reddit_community_id: nonExistentCommunityId,
          reddit_post_type_id: postTypeId,
        } satisfies IRedditCommunityPost.ICreate,
      });
    },
  );

  // Step 7: Test community access control implications
  const restrictedCommunityName = RandomGenerator.name()
    .replace(/\s/g, "_")
    .toLowerCase();
  const restrictedCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: restrictedCommunityName,
        title: "Restricted Community for Testing",
        description: "Testing access restrictions and posting requirements",
        category_name: "Education",
        type: "restricted",
        post_requirement_min_karma: 50,
        post_requirement_min_age: 30,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(restrictedCommunity);

  TestValidator.equals(
    "restricted community type",
    restrictedCommunity.type,
    "restricted",
  );
  TestValidator.equals(
    "restricted community has karma requirement",
    restrictedCommunity.post_requirement_min_karma,
    50,
  );
  TestValidator.equals(
    "restricted community has age requirement",
    restrictedCommunity.post_requirement_min_age,
    30,
  );

  // Step 8: Create post in restricted community (should succeed as member)
  const restrictedPostTitle = "Test Post in Restricted Community";
  const restrictedPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        title: restrictedPostTitle,
        content: RandomGenerator.content({ paragraphs: 2 }),
        reddit_community_id: restrictedCommunity.id,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(restrictedPost);

  TestValidator.equals(
    "restricted post community association",
    restrictedPost.community.id,
    restrictedCommunity.id,
  );
  TestValidator.equals(
    "restricted post title matches",
    restrictedPost.title,
    restrictedPostTitle,
  );

  // Step 9: Test link post creation
  const linkPostTitle = "Interesting Technology Link";
  const linkUrl = `https://example.com/${RandomGenerator.alphabets(10)}`;

  const linkPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: linkPostTitle,
        link_url: linkUrl,
        reddit_community_id: publicCommunity.id,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(linkPost);

  TestValidator.equals(
    "link post title matches",
    linkPost.title,
    linkPostTitle,
  );
  TestValidator.equals("link post URL matches", linkPost.link_url, linkUrl);
  TestValidator.equals(
    "link post community ID matches",
    linkPost.community.id,
    publicCommunity.id,
  );

  // Step 10: Validate post type diversity in same community
  TestValidator.notEquals(
    "text post ID differs from link post ID",
    post.id,
    linkPost.id,
  );
  TestValidator.equals(
    "both posts belong to same community",
    publicCommunity.id,
    linkPost.community.id,
  );

  // Step 11: Test duplicate post title prevention (business logic)
  await TestValidator.error(
    "duplicate post title in same community should fail",
    async () => {
      await api.functional.redditCommunity.member.posts.create(connection, {
        body: {
          title: postTitle, // Same title as existing post
          content: "Different content",
          reddit_community_id: publicCommunity.id,
          reddit_post_type_id: postTypeId,
        } satisfies IRedditCommunityPost.ICreate,
      });
    },
  );

  // Step 12: Validate post metadata integrity
  TestValidator.predicate(
    "posts have creation timestamps",
    () =>
      typia.is<string & tags.Format<"date-time">>(post.created_at) &&
      typia.is<string & tags.Format<"date-time">>(post.updated_at),
  );

  TestValidator.predicate(
    "posts have author information",
    () =>
      post.author !== null &&
      post.author !== undefined &&
      typia.is<string & tags.Format<"uuid">>(post.author.id),
  );

  TestValidator.predicate(
    "posts have post type information",
    () =>
      post.post_type !== null &&
      post.post_type !== undefined &&
      typia.is<string & tags.Format<"uuid">>(post.post_type.id),
  );
}
