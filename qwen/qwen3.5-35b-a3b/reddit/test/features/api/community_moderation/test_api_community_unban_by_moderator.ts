import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { generate_random_reddit_platform_member_subscriptions_subscribe } from "../../../generate/generate_random_reddit_platform_member_subscriptions_subscribe";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";

export async function test_api_community_unban_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner and login
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerResponse = await authorize_member_join(ownerConnection, {
    body: {
      email: "owner@test.com",
      username: "communityowner",
      password: "password123",
      displayName: "Community Owner",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerResponse);
  // 2. Owner creates community using owner's connection (token already set by authorize)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: "Test community for unban testing",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create moderator user and login
  const modConnection: api.IConnection = { host: connection.host };
  const modResponse = await authorize_member_join(modConnection, {
    body: {
      email: "moderator@test.com",
      username: "communitymod",
      password: "password123",
      displayName: "Community Moderator",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(modResponse);
  // 4. Moderator subscribes to community using mod's connection (token already set)
  await generate_random_reddit_platform_member_subscriptions_subscribe(
    modConnection,
    {
      body: {
        reddit_platform_community_id: community.id,
      } satisfies IRedditPlatformCommunitySubscription.ICreate,
    },
  );
  // 5. Add moderator to community using owner's connection
  const moderatorAssignment =
    await generate_random_reddit_platform_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          user_id: modResponse.user.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(moderatorAssignment);
  TestValidator.equals(
    "moderator assignment created",
    moderatorAssignment.user.id,
    modResponse.user.id,
  );
  // 6. Create banned user and login
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const bannedUserResponse = await authorize_member_join(bannedUserConnection, {
    body: {
      email: "banneduser@test.com",
      username: "banneduser",
      password: "password123",
      displayName: "Banned User",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(bannedUserResponse);
  // 7. Banned user subscribes to community
  await generate_random_reddit_platform_member_subscriptions_subscribe(
    bannedUserConnection,
    {
      body: {
        reddit_platform_community_id: community.id,
      } satisfies IRedditPlatformCommunitySubscription.ICreate,
    },
  );
  // 8. Moderator bans the user (mod's connection has token from authorize)
  const banRecord =
    await generate_random_reddit_platform_member_communities_bans_create(
      modConnection,
      {
        body: {
          userId: bannedUserResponse.user.id,
          expiresAt: null,
        } satisfies IRedditPlatformCommunityBan.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(banRecord);
  typia.assert(banRecord.deletedAt === null); // Active ban should have deletedAt null
  TestValidator.equals(
    "ban created successfully",
    banRecord.author.id,
    bannedUserResponse.user.id,
  );
  // 9. Moderator unban the user (DELETE operation)
  const deleteResponse =
    await api.functional.redditPlatform.member.communities.bans.eraseByCommunityidAndBanid(
      modConnection,
      {
        communityId: community.id,
        banId: banRecord.id,
      },
    );
  typia.assert(deleteResponse);
  TestValidator.equals("unban operation completed successfully", true, true);
  // 10. Verify moderator role is preserved (moderator can still ban users)
  const anotherUserConnection: api.IConnection = { host: connection.host };
  const anotherUserResponse = await authorize_member_join(
    anotherUserConnection,
    {
      body: {
        email: "anotheruser@test.com",
        username: "anotheruser",
        password: "password123",
        displayName: "Another User",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(anotherUserResponse);
  // Another user subscribes to community
  await generate_random_reddit_platform_member_subscriptions_subscribe(
    anotherUserConnection,
    {
      body: {
        reddit_platform_community_id: community.id,
      } satisfies IRedditPlatformCommunitySubscription.ICreate,
    },
  );
  // Moderator can still ban the new user (proving moderator role is preserved)
  const newBanRecord =
    await generate_random_reddit_platform_member_communities_bans_create(
      modConnection,
      {
        body: {
          userId: anotherUserResponse.user.id,
          expiresAt: null,
        } satisfies IRedditPlatformCommunityBan.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(newBanRecord);
  TestValidator.equals(
    "moderator can still ban users after unban",
    newBanRecord.author.id,
    anotherUserResponse.user.id,
  );
  // 11. Unban the second user to clean up
  await api.functional.redditPlatform.member.communities.bans.eraseByCommunityidAndBanid(
    modConnection,
    {
      communityId: community.id,
      banId: newBanRecord.id,
    },
  );
  typia.assert(deleteResponse);
}
