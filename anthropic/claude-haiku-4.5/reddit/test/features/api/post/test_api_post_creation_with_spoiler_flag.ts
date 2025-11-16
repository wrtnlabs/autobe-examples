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
 * Test post creation with spoiler flag functionality.
 *
 * Validates that posts can be marked with has_spoiler flag to warn users about
 * plot spoilers. Tests both spoiler-marked and non-spoiler posts to ensure
 * proper content protection.
 *
 * Workflow:
 *
 * 1. Create admin account and set up category
 * 2. Create member account
 * 3. Create text post without spoiler flag (default behavior)
 * 4. Create text post with spoiler flag enabled
 * 5. Create link post with spoiler flag enabled
 * 6. Verify all posts exist with correct spoiler flags
 * 7. Validate spoiler posts are properly marked for content protection
 */
export async function test_api_post_creation_with_spoiler_flag(
  connection: api.IConnection,
) {
  // 1. Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create category for media content
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Media Discussion",
          slug: `media-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
          description: "Discuss movies, TV shows, books, and games",
          icon_url: "http://localhost:3000/icons/media.png",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: `user_${RandomGenerator.alphaNumeric(8)}`,
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Create text post without spoiler (default)
  const postWithoutSpoiler: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        title: "Great Movie Review",
        content_text: "This is a great movie with an amazing storyline!",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(postWithoutSpoiler);
  TestValidator.equals(
    "post without spoiler flag is false",
    postWithoutSpoiler.has_spoiler,
    false,
  );
  TestValidator.equals(
    "non-spoiler post is publicly visible",
    postWithoutSpoiler.visibility_status,
    "public",
  );

  // 5. Create text post with spoiler flag
  const textPostWithSpoiler: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        title: "Major Plot Twist Discussion",
        content_text: "The main character was the villain all along!",
        is_nsfw: false,
        has_spoiler: true,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(textPostWithSpoiler);
  TestValidator.equals(
    "text post with spoiler flag is true",
    textPostWithSpoiler.has_spoiler,
    true,
  );
  TestValidator.equals(
    "text post with spoiler has correct visibility",
    textPostWithSpoiler.visibility_status,
    "public",
  );
  TestValidator.equals(
    "text post preserves content",
    textPostWithSpoiler.content_text,
    "The main character was the villain all along!",
  );

  // 6. Create link post with spoiler flag
  const linkPostWithSpoiler: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "link",
        title: "Spoiler: Game Ending Revealed",
        content_link_url: "https://example.com/game-ending",
        content_link_title: "Game Ending Explained",
        content_link_description: "Here's how the game story concludes",
        content_link_thumbnail_url: "https://example.com/thumbnail.jpg",
        is_nsfw: false,
        has_spoiler: true,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(linkPostWithSpoiler);
  TestValidator.equals(
    "link post with spoiler flag is true",
    linkPostWithSpoiler.has_spoiler,
    true,
  );
  TestValidator.equals(
    "link post has metadata preserved",
    linkPostWithSpoiler.content_link_url,
    "https://example.com/game-ending",
  );
  TestValidator.equals(
    "link post title is preserved",
    linkPostWithSpoiler.content_link_title,
    "Game Ending Explained",
  );
  TestValidator.equals(
    "link post description is preserved",
    linkPostWithSpoiler.content_link_description,
    "Here's how the game story concludes",
  );

  // 7. Validate spoiler protection mechanisms
  TestValidator.predicate(
    "non-spoiler post has spoiler flag false",
    postWithoutSpoiler.has_spoiler === false,
  );

  TestValidator.predicate(
    "spoiler text post requires explicit reveal",
    textPostWithSpoiler.has_spoiler === true &&
      textPostWithSpoiler.visibility_status === "public",
  );

  TestValidator.predicate(
    "spoiler link post maintains metadata protection",
    linkPostWithSpoiler.has_spoiler === true &&
      linkPostWithSpoiler.content_link_url !== null &&
      linkPostWithSpoiler.content_link_title !== null,
  );

  // 8. Test NSFW and spoiler combinations
  const nsfwSpoilerPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        title: "NSFW and Spoiler Content",
        content_text: "This contains both mature content and spoilers",
        is_nsfw: true,
        has_spoiler: true,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(nsfwSpoilerPost);
  TestValidator.equals(
    "post can have both NSFW and spoiler flags",
    nsfwSpoilerPost.has_spoiler,
    true,
  );
  TestValidator.equals(
    "post NSFW flag is set correctly",
    nsfwSpoilerPost.is_nsfw,
    true,
  );

  // 9. Verify default has_spoiler value when not specified
  const postWithoutExplicitSpoilerFlag: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        title: "Default Spoiler Flag Test",
        content_text: "Testing default spoiler flag behavior",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(postWithoutExplicitSpoilerFlag);
  TestValidator.equals(
    "post defaults to no spoiler flag",
    postWithoutExplicitSpoilerFlag.has_spoiler,
    false,
  );
}
