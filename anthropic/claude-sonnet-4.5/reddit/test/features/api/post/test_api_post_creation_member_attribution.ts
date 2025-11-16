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
 * Test post attribution to authenticated members.
 *
 * This test verifies that posts are correctly attributed to the authenticated
 * member who creates them. It ensures that the member_id field in created posts
 * is automatically extracted from the JWT token and cannot be spoofed through
 * the request body.
 *
 * Process:
 *
 * 1. Set up test environment with moderator and community
 * 2. Create first member account (Member A)
 * 3. Authenticate as Member A and create a post
 * 4. Verify post is attributed to Member A
 * 5. Create second member account (Member B)
 * 6. Authenticate as Member B and create a post
 * 7. Verify post is attributed to Member B
 * 8. Confirm member IDs match the authenticated users
 */
export async function test_api_post_creation_member_attribution(
  connection: api.IConnection,
) {
  // Step 1: Create moderator for community setup
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        nickname: RandomGenerator.name(),
        ip: null,
        href: "https://test.com/moderator/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community for testing post attribution
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<21> &
              tags.Pattern<"^[a-z0-9_]+$">
          >(),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create first member account (Member A)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAUsername = RandomGenerator.alphaNumeric(10);
  const memberA: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberAUsername,
        email: memberAEmail,
        password: "password123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: null,
        href: "https://test.com/member/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(memberA);

  // Step 4: Create a post as Member A
  const postTypes = ["text", "link", "image"] as const;
  const postTypeA = RandomGenerator.pick(postTypes);

  const postBodyA =
    postTypeA === "text"
      ? {
          community_id: community.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "text" as const,
          body: RandomGenerator.content({ paragraphs: 3 }),
          url: null,
          image_url: null,
        }
      : postTypeA === "link"
        ? {
            community_id: community.id,
            title: RandomGenerator.paragraph({ sentences: 2 }),
            post_type: "link" as const,
            body: null,
            url: typia.random<
              string & tags.MaxLength<2000> & tags.Format<"uri">
            >(),
            image_url: null,
          }
        : {
            community_id: community.id,
            title: RandomGenerator.paragraph({ sentences: 2 }),
            post_type: "image" as const,
            body: null,
            url: null,
            image_url: typia.random<string & tags.Format<"uri">>(),
          };

  const postA: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: postBodyA satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(postA);

  // Step 5: Verify post A is attributed to Member A
  TestValidator.equals(
    "Post A member_id matches Member A ID",
    postA.member_id,
    memberA.id,
  );
  TestValidator.equals(
    "Post A community_id matches created community",
    postA.community_id,
    community.id,
  );

  // Step 6: Create second member account (Member B)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBUsername = RandomGenerator.alphaNumeric(10);
  const memberB: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberBUsername,
        email: memberBEmail,
        password: "password456",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: true,
        show_subscribed_communities: true,
        show_activity_feed: false,
        ip: null,
        href: "https://test.com/member/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(memberB);

  // Step 7: Create a post as Member B
  const postTypeB = RandomGenerator.pick(postTypes);

  const postBodyB =
    postTypeB === "text"
      ? {
          community_id: community.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "text" as const,
          body: RandomGenerator.content({ paragraphs: 2 }),
          url: null,
          image_url: null,
        }
      : postTypeB === "link"
        ? {
            community_id: community.id,
            title: RandomGenerator.paragraph({ sentences: 2 }),
            post_type: "link" as const,
            body: null,
            url: typia.random<
              string & tags.MaxLength<2000> & tags.Format<"uri">
            >(),
            image_url: null,
          }
        : {
            community_id: community.id,
            title: RandomGenerator.paragraph({ sentences: 2 }),
            post_type: "image" as const,
            body: null,
            url: null,
            image_url: typia.random<string & tags.Format<"uri">>(),
          };

  const postB: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: postBodyB satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(postB);

  // Step 8: Verify post B is attributed to Member B
  TestValidator.equals(
    "Post B member_id matches Member B ID",
    postB.member_id,
    memberB.id,
  );
  TestValidator.equals(
    "Post B community_id matches created community",
    postB.community_id,
    community.id,
  );

  // Step 9: Verify posts are attributed to different members
  TestValidator.notEquals(
    "Post A and Post B have different member_ids",
    postA.member_id,
    postB.member_id,
  );
  TestValidator.equals(
    "Member A ID matches post A member_id",
    memberA.id,
    postA.member_id,
  );
  TestValidator.equals(
    "Member B ID matches post B member_id",
    memberB.id,
    postB.member_id,
  );
}
