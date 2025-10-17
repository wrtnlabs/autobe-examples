import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test permanent ban issuance for repeat violators in a community.
 *
 * This test validates the complete workflow of issuing a permanent ban to a
 * member with a history of violations. It creates a community, assigns a
 * moderator, establishes a member's participation history through post
 * creation, then issues and validates a permanent ban with detailed reasoning
 * citing repeat violations and harassment.
 *
 * The test ensures:
 *
 * 1. Community and moderator setup is successful
 * 2. Member can create posts establishing participation history
 * 3. Permanent ban is correctly issued with is_permanent flag set to true
 * 4. No expiration date is set for permanent bans
 * 5. Ban reason and category are properly recorded
 * 6. Ban is marked as active and associated with correct member and community
 */
export async function test_api_community_ban_permanent_for_repeat_violations(
  connection: api.IConnection,
) {
  // Step 1: Create initial member account to create the community
  const communityCreatorMember = await api.functional.auth.member.join(
    connection,
    {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    },
  );
  typia.assert(communityCreatorMember);

  // Step 2: Create the community as the member
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
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
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "discussion",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Assign moderator to the community with manage_users permission
  const moderatorAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
          permissions:
            "manage_posts,manage_comments,manage_users,access_reports",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 5: Create member account that will be banned
  const memberToBan = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(memberToBan);

  // Step 6: Member creates multiple posts to establish participation history
  const postCount = 3;
  const posts = await ArrayUtil.asyncRepeat(postCount, async () => {
    return await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
        body: typia.random<string & tags.MaxLength<40000>>(),
      } satisfies IRedditLikePost.ICreate,
    });
  });

  for (const post of posts) {
    typia.assert(post);
  }

  // Step 7: Issue permanent ban with detailed reasoning
  // Note: Moderator authentication is already active from Step 3 via SDK auto-management
  const permanentBan =
    await api.functional.redditLike.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          banned_member_id: memberToBan.id,
          ban_reason_category: "harassment",
          ban_reason_text:
            "Permanent ban issued due to repeat violations including harassment, spam posting, and repeated rule breaking despite multiple warnings. User has demonstrated a pattern of disruptive behavior that violates community standards.",
          internal_notes:
            "Third violation in 30 days. Previous temporary bans: 3-day and 7-day. Escalating to permanent ban per moderation policy.",
          is_permanent: true,
          expiration_date: undefined,
        } satisfies IRedditLikeCommunityBan.ICreate,
      },
    );
  typia.assert(permanentBan);

  // Step 8: Validate the permanent ban properties
  TestValidator.equals("ban is permanent", permanentBan.is_permanent, true);
  TestValidator.predicate(
    "no expiration date for permanent ban",
    permanentBan.expiration_date === null ||
      permanentBan.expiration_date === undefined,
  );
  TestValidator.equals(
    "banned member ID matches",
    permanentBan.banned_member_id,
    memberToBan.id,
  );
  TestValidator.equals(
    "community ID matches",
    permanentBan.community_id,
    community.id,
  );
  TestValidator.equals(
    "ban reason category is harassment",
    permanentBan.ban_reason_category,
    "harassment",
  );
  TestValidator.predicate(
    "ban reason text contains violation details",
    permanentBan.ban_reason_text.includes("repeat violations"),
  );
  TestValidator.equals("ban is active", permanentBan.is_active, true);
}
