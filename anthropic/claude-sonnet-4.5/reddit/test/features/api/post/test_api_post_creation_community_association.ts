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
 * Test that posts are correctly associated with their target communities.
 *
 * This test validates the core community association mechanism for posts by:
 *
 * 1. Creating a moderator and establishing two separate communities
 * 2. Authenticating as a member to create posts
 * 3. Creating a post in the first community with explicit community_id
 * 4. Verifying the post's community_id matches the requested community
 * 5. Confirming the post is not associated with the second community
 *
 * Note: This test validates community association through the post response.
 * Feed validation (checking if posts appear in community feeds) is not possible
 * as the provided API does not include community feed/post listing endpoints.
 *
 * This ensures proper post association with the target community context.
 */
export async function test_api_post_creation_community_association(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: null,
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create first community
  const communityA =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10) satisfies string &
            tags.MinLength<3> &
            tags.MaxLength<21> &
            tags.Pattern<"^[a-z0-9_]+$">,
          display_title: RandomGenerator.name(2) satisfies string &
            tags.MaxLength<100>,
          description: RandomGenerator.paragraph({
            sentences: 3,
          }) satisfies string & tags.MaxLength<500>,
          rules: RandomGenerator.paragraph({ sentences: 2 }) satisfies string &
            tags.MaxLength<500>,
          icon_url: null,
          banner_url: null,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(communityA);

  // Step 3: Create second community
  const communityB =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10) satisfies string &
            tags.MinLength<3> &
            tags.MaxLength<21> &
            tags.Pattern<"^[a-z0-9_]+$">,
          display_title: RandomGenerator.name(2) satisfies string &
            tags.MaxLength<100>,
          description: RandomGenerator.paragraph({
            sentences: 3,
          }) satisfies string & tags.MaxLength<500>,
          rules: RandomGenerator.paragraph({ sentences: 2 }) satisfies string &
            tags.MaxLength<500>,
          icon_url: null,
          banner_url: null,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(communityB);

  // Step 4: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10) satisfies string &
        tags.MinLength<3> &
        tags.MaxLength<50>,
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
      show_online_status: undefined,
      show_subscribed_communities: undefined,
      show_activity_feed: undefined,
      ip: null,
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 5: Create a post in community A
  const postTypes = ["text", "link", "image"] as const;
  const selectedPostType = RandomGenerator.pick(postTypes);

  const postBody =
    selectedPostType === "text"
      ? {
          community_id: communityA.id,
          title: RandomGenerator.paragraph({ sentences: 2 }) satisfies string &
            tags.MinLength<3> &
            tags.MaxLength<300>,
          post_type: "text" as const,
          body: RandomGenerator.content({ paragraphs: 2 }) satisfies string &
            tags.MaxLength<40000>,
          url: null,
          image_url: null,
        }
      : selectedPostType === "link"
        ? {
            community_id: communityA.id,
            title: RandomGenerator.paragraph({
              sentences: 2,
            }) satisfies string & tags.MinLength<3> & tags.MaxLength<300>,
            post_type: "link" as const,
            body: null,
            url: typia.random<
              string & tags.MaxLength<2000> & tags.Format<"uri">
            >(),
            image_url: null,
          }
        : {
            community_id: communityA.id,
            title: RandomGenerator.paragraph({
              sentences: 2,
            }) satisfies string & tags.MinLength<3> & tags.MaxLength<300>,
            post_type: "image" as const,
            body: null,
            url: null,
            image_url: typia.random<string & tags.Format<"uri">>(),
          };

  const createdPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: postBody satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(createdPost);

  // Step 6: Verify the post has the correct community_id
  TestValidator.equals(
    "created post should have community A's ID",
    createdPost.community_id,
    communityA.id,
  );

  // Step 7: Verify post community association
  TestValidator.equals(
    "post community_id matches requested community",
    createdPost.community_id,
    communityA.id,
  );

  TestValidator.notEquals(
    "post should not be associated with community B",
    createdPost.community_id,
    communityB.id,
  );
}
