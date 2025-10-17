import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test that banned users cannot create posts in communities they are banned
 * from.
 *
 * This test validates the community ban enforcement system by verifying that
 * when a member is banned from a community, they are prevented from creating
 * posts in that community. The test creates two member accounts where one
 * creates a community (becoming the moderator), the other subscribes and gets
 * banned, then attempts to post and is rejected.
 *
 * Workflow:
 *
 * 1. Create first member account (user who will be banned)
 * 2. Create second member account (will become community creator/moderator)
 * 3. Second member creates a community (becomes moderator automatically)
 * 4. First member subscribes to the community
 * 5. Create moderator account for ban issuance
 * 6. Moderator issues community ban on first member
 * 7. First member attempts to create a post (should fail)
 * 8. Verify the post creation is rejected with appropriate error
 */
export async function test_api_post_creation_banned_user_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (the user who will be banned)
  const bannedMemberEmail = typia.random<string & tags.Format<"email">>();
  const bannedMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: bannedMemberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(bannedMember);

  // Step 2: Create second member account (will be community creator/moderator)
  const creatorMemberEmail = typia.random<string & tags.Format<"email">>();
  const creatorMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: creatorMemberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(creatorMember);

  // Step 3: Creator member creates a community (becomes moderator automatically)
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
        privacy_type: "public",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 4: Switch to banned member context and subscribe to community
  connection.headers = { Authorization: bannedMember.token.access };

  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);

  // Step 5: Create moderator account to issue the ban
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: moderatorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 6: Moderator issues ban on the first member
  const ban: IRedditLikeCommunityBan =
    await api.functional.redditLike.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          banned_member_id: bannedMember.id,
          ban_reason_category: "spam",
          ban_reason_text: "Posting spam content in the community",
          is_permanent: true,
        } satisfies IRedditLikeCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // Step 7: Switch back to banned member context
  connection.headers = { Authorization: bannedMember.token.access };

  // Step 8: Attempt to create a post as the banned member (should fail)
  await TestValidator.error(
    "banned member cannot create post in community",
    async () => {
      await api.functional.redditLike.member.communities.posts.create(
        connection,
        {
          communityId: community.id,
          body: {
            community_id: community.id,
            type: "text",
            title: typia.random<
              string & tags.MinLength<3> & tags.MaxLength<300>
            >(),
            body: typia.random<string & tags.MaxLength<40000>>(),
          } satisfies IRedditLikePost.ICreate,
        },
      );
    },
  );
}
