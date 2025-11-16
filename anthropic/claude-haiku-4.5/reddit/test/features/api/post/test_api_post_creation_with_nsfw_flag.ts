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
 * Validates that posts can be tagged with is_nsfw flag for content filtering.
 *
 * This test verifies the NSFW flagging system works correctly by:
 *
 * 1. Setting up a member account
 * 2. Creating posts with is_nsfw=true and is_nsfw=false
 * 3. Verifying the flag is correctly stored and returned in responses
 *
 * Steps:
 *
 * 1. Member joins the platform
 * 2. Member creates a post with is_nsfw=true
 * 3. Verify is_nsfw=true is in the response
 * 4. Member creates a post with is_nsfw=false
 * 5. Verify is_nsfw=false is in the response
 * 6. Member creates a post without explicit is_nsfw (should default to false)
 * 7. Verify default behavior works correctly
 */
export async function test_api_post_creation_with_nsfw_flag(
  connection: api.IConnection,
) {
  // Member setup - join platform
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "MemberPassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Generate a community ID for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // Test 1: Create post with is_nsfw=true
  const nsfwPost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: communityId,
        post_type: "text",
        title: "NSFW Content Discussion",
        content_text: "This is a post with NSFW content flagged",
        is_nsfw: true,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(nsfwPost);
  TestValidator.equals(
    "post with is_nsfw=true should have is_nsfw flag set to true",
    nsfwPost.is_nsfw,
    true,
  );
  TestValidator.equals(
    "post title should match",
    nsfwPost.title,
    "NSFW Content Discussion",
  );

  // Test 2: Create post with is_nsfw=false
  const safePost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: communityId,
        post_type: "text",
        title: "Safe Content Discussion",
        content_text: "This is a post without NSFW content",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(safePost);
  TestValidator.equals(
    "post with is_nsfw=false should have is_nsfw flag set to false",
    safePost.is_nsfw,
    false,
  );
  TestValidator.equals(
    "post title should match",
    safePost.title,
    "Safe Content Discussion",
  );

  // Test 3: Create post without explicit is_nsfw (should default to false)
  const defaultPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: communityId,
        post_type: "text",
        title: "Default Flag Post",
        content_text: "Post without explicit is_nsfw flag",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(defaultPost);
  TestValidator.equals(
    "post without explicit is_nsfw should default to false",
    defaultPost.is_nsfw,
    false,
  );

  // Test 4: Verify link post with is_nsfw=true
  const nsfwLinkPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: communityId,
        post_type: "link",
        title: "NSFW Link Post",
        content_link_url: "https://example.com/adult-content",
        is_nsfw: true,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(nsfwLinkPost);
  TestValidator.equals(
    "link post with is_nsfw=true should be flagged",
    nsfwLinkPost.is_nsfw,
    true,
  );
  TestValidator.equals(
    "post type should be link",
    nsfwLinkPost.post_type,
    "link",
  );

  // Test 5: Verify image post with is_nsfw=false
  const safeImagePost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: communityId,
        post_type: "image",
        title: "Safe Image Post",
        is_nsfw: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(safeImagePost);
  TestValidator.equals(
    "image post should not be NSFW flagged",
    safeImagePost.is_nsfw,
    false,
  );
  TestValidator.equals(
    "post type should be image",
    safeImagePost.post_type,
    "image",
  );

  // Final validation: Ensure different posts have correct flags
  TestValidator.predicate(
    "NSFW post flag should be true",
    nsfwPost.is_nsfw === true,
  );
  TestValidator.predicate(
    "safe post flag should be false",
    safePost.is_nsfw === false,
  );
  TestValidator.predicate(
    "default post flag should be false",
    defaultPost.is_nsfw === false,
  );
  TestValidator.predicate(
    "NSFW link post flag should be true",
    nsfwLinkPost.is_nsfw === true,
  );
  TestValidator.predicate(
    "safe image post flag should be false",
    safeImagePost.is_nsfw === false,
  );
}
