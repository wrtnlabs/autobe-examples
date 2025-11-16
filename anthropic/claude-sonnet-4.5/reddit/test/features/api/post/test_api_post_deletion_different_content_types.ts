import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test post deletion across all three content types: text, link, and image.
 *
 * This test validates that the soft delete mechanism is content-type agnostic
 * and handles all post variants consistently. It ensures that deletion works
 * correctly for text posts with body content, link posts with URLs, and image
 * posts with uploaded images.
 *
 * Test workflow:
 *
 * 1. Create moderator and authenticate
 * 2. Create community for testing
 * 3. Create member and authenticate
 * 4. Create three posts with different content types (text, link, image)
 * 5. Delete each post type
 * 6. Validate all posts are marked with deleted_at timestamps
 * 7. Verify type-specific content fields are preserved after deletion
 */
export async function test_api_post_deletion_different_content_types(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePass123!",
      nickname: RandomGenerator.name(),
      ip: null,
      href: "https://reddit-community.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: memberEmail,
      password: "MemberPass456!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 4 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: "https://reddit-community.com/signup" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Create text post with body content
  const textPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 3 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(textPost);
  TestValidator.equals("text post type", textPost.post_type, "text");
  TestValidator.predicate(
    "text post has body content",
    textPost.body !== null && textPost.body !== undefined,
  );

  // Step 5: Create link post with URL
  const linkPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "link",
        body: null,
        url: "https://example.com/article" satisfies string &
          tags.Format<"uri">,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(linkPost);
  TestValidator.equals("link post type", linkPost.post_type, "link");
  TestValidator.predicate(
    "link post has URL",
    linkPost.url !== null && linkPost.url !== undefined,
  );

  // Step 6: Create image post with image_url
  const imagePost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "image",
        body: null,
        url: null,
        image_url: "https://cdn.example.com/images/photo.jpg" satisfies string &
          tags.Format<"uri">,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(imagePost);
  TestValidator.equals("image post type", imagePost.post_type, "image");
  TestValidator.predicate(
    "image post has image URL",
    imagePost.image_url !== null && imagePost.image_url !== undefined,
  );

  // Step 7: Delete text post
  const deletedTextPost =
    await api.functional.redditCommunity.member.posts.erase(connection, {
      postId: textPost.id,
    });
  typia.assert(deletedTextPost);
  TestValidator.predicate(
    "text post is marked as deleted",
    deletedTextPost.deleted_at !== null &&
      deletedTextPost.deleted_at !== undefined,
  );
  TestValidator.equals(
    "text post body preserved after deletion",
    deletedTextPost.body,
    textPost.body,
  );
  TestValidator.equals(
    "text post ID unchanged",
    deletedTextPost.id,
    textPost.id,
  );

  // Step 8: Delete link post
  const deletedLinkPost =
    await api.functional.redditCommunity.member.posts.erase(connection, {
      postId: linkPost.id,
    });
  typia.assert(deletedLinkPost);
  TestValidator.predicate(
    "link post is marked as deleted",
    deletedLinkPost.deleted_at !== null &&
      deletedLinkPost.deleted_at !== undefined,
  );
  TestValidator.equals(
    "link post URL preserved after deletion",
    deletedLinkPost.url,
    linkPost.url,
  );
  TestValidator.equals(
    "link post ID unchanged",
    deletedLinkPost.id,
    linkPost.id,
  );

  // Step 9: Delete image post
  const deletedImagePost =
    await api.functional.redditCommunity.member.posts.erase(connection, {
      postId: imagePost.id,
    });
  typia.assert(deletedImagePost);
  TestValidator.predicate(
    "image post is marked as deleted",
    deletedImagePost.deleted_at !== null &&
      deletedImagePost.deleted_at !== undefined,
  );
  TestValidator.equals(
    "image post image_url preserved after deletion",
    deletedImagePost.image_url,
    imagePost.image_url,
  );
  TestValidator.equals(
    "image post ID unchanged",
    deletedImagePost.id,
    imagePost.id,
  );
}
