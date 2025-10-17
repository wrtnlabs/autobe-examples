import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityBan";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_community_ban_list_filtered_by_status(
  connection: api.IConnection,
) {
  // 1. Create a member account and use it to create a community
  const communityCreatorMember = await api.functional.auth.member.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IRedditLikeMember.ICreate,
    },
  );
  typia.assert(communityCreatorMember);

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // 2. Authenticate as a moderator and assign them to manage the community
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  const moderatorAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
          permissions: "manage_users,manage_posts",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // 3. Create several member accounts that will be banned
  const bannedMembers = await ArrayUtil.asyncRepeat(4, async () => {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IRedditLikeMember.ICreate,
    });
    typia.assert(member);
    return member;
  });

  // 4. Have those members create posts to establish community participation
  for (const member of bannedMembers) {
    const post = await api.functional.redditLike.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          type: "text",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditLikePost.ICreate,
      },
    );
    typia.assert(post);
  }

  // 5. Issue multiple bans with different characteristics
  const now = new Date();
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Temporary ban - expires in 1 day
  const tempBan1 =
    await api.functional.redditLike.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          banned_member_id: bannedMembers[0].id,
          ban_reason_category: "spam",
          ban_reason_text: "Posting spam content repeatedly",
          is_permanent: false,
          expiration_date: oneDayLater.toISOString(),
        } satisfies IRedditLikeCommunityBan.ICreate,
      },
    );
  typia.assert(tempBan1);

  // Temporary ban - expires in 1 week
  const tempBan2 =
    await api.functional.redditLike.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          banned_member_id: bannedMembers[1].id,
          ban_reason_category: "harassment",
          ban_reason_text: "Harassing other community members",
          is_permanent: false,
          expiration_date: oneWeekLater.toISOString(),
        } satisfies IRedditLikeCommunityBan.ICreate,
      },
    );
  typia.assert(tempBan2);

  // Permanent ban
  const permBan1 =
    await api.functional.redditLike.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          banned_member_id: bannedMembers[2].id,
          ban_reason_category: "hate_speech",
          ban_reason_text: "Posted hate speech violating community guidelines",
          is_permanent: true,
        } satisfies IRedditLikeCommunityBan.ICreate,
      },
    );
  typia.assert(permBan1);

  // Another temporary ban that will be lifted
  const tempBanToLift =
    await api.functional.redditLike.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          banned_member_id: bannedMembers[3].id,
          ban_reason_category: "other",
          ban_reason_text: "Temporary ban for investigation",
          is_permanent: false,
          expiration_date: oneWeekLater.toISOString(),
        } satisfies IRedditLikeCommunityBan.ICreate,
      },
    );
  typia.assert(tempBanToLift);

  // 6. Lift one of the bans to create a mix of active and inactive ban statuses
  await api.functional.redditLike.moderator.communities.bans.erase(connection, {
    communityId: community.id,
    banId: tempBanToLift.id,
  });

  // 7. Retrieve the ban list filtered by is_active: true
  const activeBansPage =
    await api.functional.redditLike.moderator.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          is_active: true,
          page: 1,
          limit: 10,
        } satisfies IRedditLikeCommunityBan.IRequest,
      },
    );
  typia.assert(activeBansPage);

  // Validate only currently enforced bans appear (should be 3: tempBan1, tempBan2, permBan1)
  TestValidator.equals(
    "active bans count should be 3",
    activeBansPage.data.length,
    3,
  );
  TestValidator.predicate(
    "all active bans should have is_active true",
    activeBansPage.data.every((ban) => ban.is_active === true),
  );

  // Verify the lifted ban is not in active bans
  TestValidator.predicate(
    "lifted ban should not be in active bans",
    !activeBansPage.data.some((ban) => ban.id === tempBanToLift.id),
  );

  // 8. Retrieve the ban list without active filter to get all bans including lifted ones
  const allBansPage =
    await api.functional.redditLike.moderator.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditLikeCommunityBan.IRequest,
      },
    );
  typia.assert(allBansPage);

  // 9. Validate that all bans are returned including the lifted one
  TestValidator.predicate(
    "all bans count should be 4 or more",
    allBansPage.data.length >= 4,
  );

  // Verify specific bans exist in the complete list
  const banIds = allBansPage.data.map((ban) => ban.id);
  TestValidator.predicate(
    "tempBan1 exists in all bans",
    banIds.includes(tempBan1.id),
  );
  TestValidator.predicate(
    "tempBan2 exists in all bans",
    banIds.includes(tempBan2.id),
  );
  TestValidator.predicate(
    "permBan1 exists in all bans",
    banIds.includes(permBan1.id),
  );
  TestValidator.predicate(
    "lifted ban exists in all bans",
    banIds.includes(tempBanToLift.id),
  );

  // Retrieve inactive bans specifically
  const inactiveBansPage =
    await api.functional.redditLike.moderator.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          is_active: false,
          page: 1,
          limit: 10,
        } satisfies IRedditLikeCommunityBan.IRequest,
      },
    );
  typia.assert(inactiveBansPage);

  // Validate inactive bans contain the lifted ban
  TestValidator.predicate(
    "inactive bans should contain at least the lifted ban",
    inactiveBansPage.data.length >= 1,
  );
  TestValidator.predicate(
    "lifted ban should be in inactive bans",
    inactiveBansPage.data.some((ban) => ban.id === tempBanToLift.id),
  );
  TestValidator.predicate(
    "all inactive bans should have is_active false",
    inactiveBansPage.data.every((ban) => ban.is_active === false),
  );
}
