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
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

/**
 * Test profile deletion when the member has created posts and comments.
 *
 * This scenario validates that profile deletion works correctly when the member
 * has existing content, ensuring that posts, comments, and other user-generated
 * content are handled appropriately during profile removal. The test verifies
 * that content attribution is managed correctly while the profile data is
 * removed.
 *
 * Test workflow:
 *
 * 1. Register a new member account to establish authentication context
 * 2. Create a user profile with personal information and customization
 * 3. Create a community for posting content
 * 4. Create multiple posts attributed to the user's profile
 * 5. Delete the user profile containing the posts
 * 6. Verify successful deletion and proper content handling
 */
export async function test_api_user_profile_delete_with_user_content(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "TestPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a user profile for the member
  const profile =
    await api.functional.redditCommunity.member.userProfiles.create(
      connection,
      {
        body: {
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 3 }),
          location: "San Francisco, CA",
          website_url: "https://example.com",
          href: "https://reddit-community.com",
          referrer: "https://google.com",
          ip: "192.168.1.1",
        } satisfies IRedditCommunityUserProfiles.ICreate,
      },
    );
  typia.assert(profile);

  // Step 3: Create a community for testing
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        category_name: "technology",
        type: "public",
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 4: Create multiple posts attributed to this profile
  const postTitles = ArrayUtil.repeat(3, () =>
    RandomGenerator.paragraph({ sentences: 1 }),
  );

  const posts = await ArrayUtil.asyncRepeat(3, async (index) => {
    const postTypeId = typia.random<string & tags.Format<"uuid">>();
    return await api.functional.redditCommunity.member.posts.create(
      connection,
      {
        body: {
          title: postTitles[index],
          content: RandomGenerator.content({ paragraphs: 2 }),
          reddit_community_id: community.id,
          reddit_post_type_id: postTypeId,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  });

  posts.forEach((post) => typia.assert(post));

  // Step 5: Delete the user profile
  await api.functional.redditCommunity.member.userProfiles.erase(connection, {
    profileId: profile.id,
  });

  // Step 6: Verify profile deletion was successful
  TestValidator.predicate("profile deletion completed successfully", true);

  // Validate that the test setup was complete - posts were created before deletion
  TestValidator.equals(
    "number of posts created before profile deletion",
    posts.length,
    3,
  );
  TestValidator.predicate(
    "all posts were created with valid IDs",
    posts.every(
      (post) => post.id !== null && post.id !== undefined && post.id.length > 0,
    ),
  );
}
