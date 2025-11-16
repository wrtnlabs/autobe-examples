import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test retrieval of posts with moderator-set flags.
 *
 * This test validates that moderator flags (is_locked, is_pinned) are correctly
 * initialized and returned when retrieving posts. Posts created by regular
 * members should have these flags set to false initially, and the API should
 * accurately return these flags for use in determining post moderation status
 * in feeds and detail views.
 *
 * Test workflow:
 *
 * 1. Create an administrator account for platform setup
 * 2. Create a platform content category
 * 3. Create a member account to serve as post creator
 * 4. Create a community for the post
 * 5. Create a post with default moderator flags
 * 6. Retrieve the post by ID using the posts endpoint
 * 7. Validate that moderator flags are correctly set to false
 * 8. Verify flag values match creation expectations
 */
export async function test_api_post_retrieval_moderator_flags(
  connection: api.IConnection,
) {
  // 1. Create an administrator account for platform setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(10),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // 2. Create a platform content category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create a member account to be post creator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphabets(10),
      href: "https://example.com/register",
      referrer: "",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 4. Create a community for posting
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussions",
          identifier: "tech_discussions",
          description: "A place to discuss technology topics",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create a post with default moderator flags
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Understanding TypeScript",
        content_text:
          "TypeScript is a powerful language for building scalable applications.",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Validate initial moderator flags on created post
  TestValidator.equals(
    "newly created post should not be locked",
    post.is_locked,
    false,
  );
  TestValidator.equals(
    "newly created post should not be pinned",
    post.is_pinned,
    false,
  );

  // 6. Retrieve the post by ID
  const retrievedPost = await api.functional.communityPlatform.posts.at(
    connection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrievedPost);

  // 7. Validate moderator flags in retrieved post
  TestValidator.equals(
    "retrieved post is_locked flag should be false",
    retrievedPost.is_locked,
    false,
  );
  TestValidator.equals(
    "retrieved post is_pinned flag should be false",
    retrievedPost.is_pinned,
    false,
  );

  // 8. Verify post ID and title match expectations
  TestValidator.equals(
    "retrieved post ID should match created post ID",
    retrievedPost.id,
    post.id,
  );
  TestValidator.equals(
    "retrieved post title should match created post title",
    retrievedPost.title,
    post.title,
  );

  // 9. Verify moderator flags accurately reflect moderation status
  TestValidator.predicate(
    "post moderation status can be determined from flags",
    !retrievedPost.is_locked && !retrievedPost.is_pinned,
  );
}
