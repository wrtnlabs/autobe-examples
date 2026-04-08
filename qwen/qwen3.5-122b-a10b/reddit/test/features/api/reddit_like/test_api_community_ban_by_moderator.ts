import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_bans_create } from "../../../generate/generate_random_reddit_like_member_communities_bans_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_ban } from "../../../prepare/prepare_random_reddit_like_community_ban";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";

export async function test_api_community_ban_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(owner);
  // 2. Owner creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create moderator account and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(moderator);
  // 4. Owner adds moderator to the community
  const moderatorAssignment =
    await generate_random_reddit_like_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          member_id: moderator.id,
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Create target member account and authenticate
  const targetConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(targetMember);
  // 6. Target member subscribes to the community
  const subscription =
    await generate_random_reddit_like_member_subscriptions_create(
      targetConnection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditLikeCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 7. Moderator bans the target member
  const ban = await generate_random_reddit_like_member_communities_bans_create(
    moderatorConnection,
    {
      params: { communityId: community.id },
      body: {
        member_id: targetMember.id,
      } satisfies IRedditLikeCommunityBan.ICreate,
    },
  );
  typia.assert(ban);
  // 8-10. Verify ban record details
  TestValidator.equals("ban community matches", ban.community.id, community.id);
  TestValidator.equals(
    "banned member matches",
    ban.bannedMember.id,
    targetMember.id,
  );
  TestValidator.equals("banned by is moderator", ban.bannedBy.id, moderator.id);
  TestValidator.predicate("ban has valid id", ban.id.length > 0);
  TestValidator.predicate(
    "ban has created timestamp",
    ban.created_at.length > 0,
  );
  TestValidator.predicate("ban is active", ban.deleted_at === null);
}
