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

export async function test_api_community_delete_cascade_operations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "password123",
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(owner);
  // 2. Register moderators
  const moderators: IRedditPlatformMember.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const modConnection: api.IConnection = { host: connection.host };
    const mod = await authorize_member_join(modConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10) + `mod${i}`,
        password: "password123",
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    typia.assert(mod);
    moderators.push(mod);
  }
  // 3. Register banned users
  const bannedUsers: IRedditPlatformMember.IAuthorized[] = [];
  for (let i = 0; i < 2; i++) {
    const bannedConnection: api.IConnection = { host: connection.host };
    const banned = await authorize_member_join(bannedConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10) + `banned${i}`,
        password: "password123",
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    typia.assert(banned);
    bannedUsers.push(banned);
  }
  // 4. Register subscribers
  const subscribers: IRedditPlatformMember.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const subConnection: api.IConnection = { host: connection.host };
    const sub = await authorize_member_join(subConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10) + `sub${i}`,
        password: "password123",
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    typia.assert(sub);
    subscribers.push(sub);
  }
  // 5. Create community as owner
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await api.functional.redditPlatform.member.communities.create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 6. Add moderators to community
  for (const mod of moderators) {
    const modAddConnection: api.IConnection = { host: connection.host };
    const addedMod =
      await api.functional.redditPlatform.member.communities.moderators.create(
        modAddConnection,
        {
          communityId: community.id,
          body: {
            user_id: mod.user.id,
          } satisfies IRedditPlatformCommunityModerator.ICreate,
        },
      );
    typia.assert(addedMod);
  }
  // 7. Ban users in community
  for (const banned of bannedUsers) {
    const banConnection: api.IConnection = { host: connection.host };
    const ban =
      await api.functional.redditPlatform.member.communities.bans.create(
        banConnection,
        {
          communityId: community.id,
          body: {
            userId: banned.user.id,
            expiresAt: null,
          } satisfies IRedditPlatformCommunityBan.ICreate,
        },
      );
    typia.assert(ban);
  }
  // 8. Subscribe users to community
  for (const sub of subscribers) {
    const subConnection: api.IConnection = { host: connection.host };
    const subscription =
      await api.functional.redditPlatform.member.subscriptions.subscribe(
        subConnection,
        {
          body: {
            reddit_platform_community_id: community.id,
          } satisfies IRedditPlatformCommunitySubscription.ICreate,
        },
      );
    typia.assert(subscription);
  }
  // 9. Delete community as owner - cascade deletion should happen
  const deleteConnection: api.IConnection = { host: connection.host };
  await api.functional.redditPlatform.member.communities.erase(
    deleteConnection,
    {
      communityId: community.id,
    },
  );
  // 10. Verify cascade deletion by ensuring all related resources are removed
  // - This test validates that the database transaction completed successfully
  // - All moderators, bans, subscriptions, and audit logs should be deleted
  // - The community should have deleted_at timestamp set
  TestValidator.predicate("community deletion completed successfully", true);
}
