import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityBan";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_community_bans_create } from "../../../generate/generate_random_reddit_like_community_member_communities_community_bans_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_ban } from "../../../prepare/prepare_random_reddit_like_community_community_ban";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";

export async function test_api_ban_list_active_restrictions_with_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Member1 creates community
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(community);
  // 2. Member2 joins and subscribes
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    member2Connection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 3. Member3 joins
  const member3Connection: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 4. Member1 bans Member2
  const ban2 =
    await generate_random_reddit_like_community_member_communities_community_bans_create(
      member1Connection,
      {
        params: { communityId: community.id },
        body: {
          member_id: member2.id,
          reason: "spam posting",
        },
      },
    );
  typia.assert(ban2);
  // 5. Member1 bans Member3
  const ban3 =
    await generate_random_reddit_like_community_member_communities_community_bans_create(
      member1Connection,
      {
        params: { communityId: community.id },
        body: {
          member_id: member3.id,
          reason: "harassment",
        },
      },
    );
  typia.assert(ban3);
  // 6. List all active bans (no auth required)
  const publicConnection: api.IConnection = { host: connection.host };
  const allBans = await api.functional.redditLikeCommunity.bans.index(
    publicConnection,
    {
      body: {} satisfies IRedditLikeCommunityBan.IRequest,
    },
  );
  typia.assert(allBans);
  TestValidator.predicate(
    "all active bans retrieved",
    allBans.data.length >= 2,
  );
  // 7. Filter by reason substring "spam"
  const spamBans = await api.functional.redditLikeCommunity.bans.index(
    publicConnection,
    {
      body: {
        reason: "spam",
      } satisfies IRedditLikeCommunityBan.IRequest,
    },
  );
  typia.assert(spamBans);
  TestValidator.equals("reason filter count", spamBans.data.length, 1);
  TestValidator.equals(
    "reason filter matches target ban",
    spamBans.data[0].id,
    ban2.id,
  );
  // 8. Filter by community_id
  const communityBans = await api.functional.redditLikeCommunity.bans.index(
    publicConnection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditLikeCommunityBan.IRequest,
    },
  );
  typia.assert(communityBans);
  TestValidator.predicate(
    "community filter returns expected bans",
    communityBans.data.length >= 2,
  );
  // 9. Filter by banned_member_id
  const memberBans = await api.functional.redditLikeCommunity.bans.index(
    publicConnection,
    {
      body: {
        banned_member_id: member2.id,
      } satisfies IRedditLikeCommunityBan.IRequest,
    },
  );
  typia.assert(memberBans);
  TestValidator.equals("member filter count", memberBans.data.length, 1);
  TestValidator.equals(
    "member filter matches target ban",
    memberBans.data[0].id,
    ban2.id,
  );
}
