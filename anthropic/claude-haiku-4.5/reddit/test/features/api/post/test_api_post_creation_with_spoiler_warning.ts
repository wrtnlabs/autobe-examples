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
 * Test post creation with spoiler warning functionality.
 *
 * Validates that members can create posts marked with spoiler warnings, and
 * that the has_spoiler flag is properly set, preserved, and can be used for
 * content filtering. Tests both spoiler posts and regular posts to ensure
 * proper default behavior.
 *
 * Setup:
 *
 * 1. Administrator creates a category for organizing communities
 * 2. Member creates a community within that category
 * 3. Member creates posts with and without spoiler warnings
 *
 * Validation:
 *
 * 1. Posts with has_spoiler=true preserve the flag in response
 * 2. Posts without spoiler flag default to has_spoiler=false
 * 3. Spoiler flag is correctly set for filtering purposes
 * 4. Multiple posts maintain their individual spoiler states
 */
export async function test_api_post_creation_with_spoiler_warning(
  connection: api.IConnection,
) {
  // 1. Administrator registration and category creation
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        name: "Test Administrator",
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Entertainment",
          slug: `entertainment_${RandomGenerator.alphaNumeric(4)}`,
          description: "Movies, TV shows, books, and games discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2. Member registration and authentication
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberAccount: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberAccount);

  // 3. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Movie Discussions",
          identifier: `movies_${RandomGenerator.alphaNumeric(4)}`,
          description: "Discuss movies, reviews, and plot analysis",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Create post WITH spoiler warning
  const spoilerPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "My thoughts on the latest movie",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
        has_spoiler: true,
        is_nsfw: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(spoilerPost);

  TestValidator.equals(
    "spoiler post has_spoiler flag is true",
    spoilerPost.has_spoiler,
    true,
  );
  TestValidator.equals(
    "spoiler post post_type is text",
    spoilerPost.post_type,
    "text",
  );
  TestValidator.predicate(
    "spoiler post should have default vote_score of 0",
    spoilerPost.vote_score === 0,
  );
  TestValidator.predicate(
    "spoiler post should have default comment_count of 0",
    spoilerPost.comment_count === 0,
  );

  // 5. Create post WITHOUT spoiler warning (default behavior)
  const regularPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "General movie discussion",
        content_text: RandomGenerator.paragraph({ sentences: 4 }),
        is_nsfw: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(regularPost);

  TestValidator.equals(
    "regular post has_spoiler flag defaults to false",
    regularPost.has_spoiler,
    false,
  );
  TestValidator.equals(
    "regular post post_type is text",
    regularPost.post_type,
    "text",
  );

  // 6. Create another spoiler post to verify state isolation
  const anotherSpoilerPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Book series ending revealed",
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
        has_spoiler: true,
        is_nsfw: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(anotherSpoilerPost);

  TestValidator.equals(
    "second spoiler post has_spoiler flag is true",
    anotherSpoilerPost.has_spoiler,
    true,
  );

  // 7. Verify spoiler posts are distinct from regular posts
  TestValidator.notEquals(
    "spoiler post and regular post should have different spoiler flags",
    regularPost.has_spoiler,
    spoilerPost.has_spoiler,
  );

  // 8. Validate creator information
  TestValidator.equals(
    "spoiler post creator matches authenticated member",
    spoilerPost.creator.id,
    memberAccount.id,
  );
  TestValidator.equals(
    "regular post creator matches authenticated member",
    regularPost.creator.id,
    memberAccount.id,
  );

  // 9. Validate community relationship
  TestValidator.equals(
    "spoiler post belongs to created community",
    spoilerPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "regular post belongs to created community",
    regularPost.community.id,
    community.id,
  );

  // 10. Validate visibility status defaults
  TestValidator.equals(
    "spoiler post visibility is public by default",
    spoilerPost.visibility_status,
    "public",
  );
  TestValidator.equals(
    "regular post visibility is public by default",
    regularPost.visibility_status,
    "public",
  );

  // 11. Test NSFW and spoiler combinations
  const nsfwSpoilerPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Adult content with spoilers",
        content_text: RandomGenerator.paragraph({ sentences: 2 }),
        has_spoiler: true,
        is_nsfw: true,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(nsfwSpoilerPost);

  TestValidator.equals(
    "nsfw spoiler post has_spoiler is true",
    nsfwSpoilerPost.has_spoiler,
    true,
  );
  TestValidator.equals(
    "nsfw spoiler post is_nsfw is true",
    nsfwSpoilerPost.is_nsfw,
    true,
  );

  // 12. Test post with only NSFW flag (no spoiler)
  const nsfwOnlyPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Adult content without spoilers",
        content_text: RandomGenerator.paragraph({ sentences: 2 }),
        is_nsfw: true,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(nsfwOnlyPost);

  TestValidator.equals(
    "nsfw only post has_spoiler defaults to false",
    nsfwOnlyPost.has_spoiler,
    false,
  );
  TestValidator.equals(
    "nsfw only post is_nsfw is true",
    nsfwOnlyPost.is_nsfw,
    true,
  );
}
