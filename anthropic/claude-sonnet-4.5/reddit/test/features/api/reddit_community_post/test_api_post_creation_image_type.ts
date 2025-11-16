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
 * Test creating an image post with uploaded visual content.
 *
 * This validates the image post creation workflow where members share images
 * stored in the platform's storage service. The test verifies that post_type is
 * 'image', the image_url field contains a valid URI reference to the uploaded
 * image, body and url are null, and the post is properly created with all
 * metadata.
 *
 * This scenario assumes the image has been pre-uploaded to storage in a
 * separate operation and the post creation receives the permanent image URL.
 *
 * Steps:
 *
 * 1. Create and authenticate moderator account
 * 2. Moderator creates community for image sharing
 * 3. Create and authenticate member account
 * 4. Member creates image post with pre-uploaded image URL
 * 5. Verify complete post entity with correct type-specific field population
 */
export async function test_api_post_creation_image_type(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorNickname = RandomGenerator.name();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: moderatorNickname,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates community for image sharing
  const communityName = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<21> &
      tags.Pattern<"^[a-z0-9_]+$">
  >();
  const communityDisplayTitle = RandomGenerator.paragraph({ sentences: 3 });
  const communityDescription = RandomGenerator.paragraph({ sentences: 5 });
  const communityRules = RandomGenerator.paragraph({ sentences: 4 });

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: communityDisplayTitle,
          description: communityDescription,
          rules: communityRules,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate member account
  const memberUsername = RandomGenerator.name();
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Member creates image post with pre-uploaded image URL
  const postTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const imageUrl = typia.random<string & tags.Format<"uri">>();

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: postTitle,
        post_type: "image",
        image_url: imageUrl,
        body: null,
        url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Verify complete post entity with correct type-specific field population
  TestValidator.equals("post type is image", post.post_type, "image");
  TestValidator.equals("image URL is populated", post.image_url, imageUrl);
  TestValidator.equals("body field is null for image post", post.body, null);
  TestValidator.equals("url field is null for image post", post.url, null);
  TestValidator.equals(
    "post is associated with community",
    post.community_id,
    community.id,
  );
  TestValidator.equals("post is authored by member", post.member_id, member.id);
  TestValidator.equals("post title matches", post.title, postTitle);
  TestValidator.equals("post is not edited on creation", post.edited, false);
}
