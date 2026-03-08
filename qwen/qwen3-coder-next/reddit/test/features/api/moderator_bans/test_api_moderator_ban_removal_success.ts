import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_like_moderator_communities_bans_create";
import { prepare_random_reddit_like_ban } from "../../../prepare/prepare_random_reddit_like_ban";

export async function test_api_moderator_ban_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator and member
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    bio: null,
    avatar_url: null,
    href: "https://example.com",
    referrer: "https://example.com",
  } satisfies IRedditLikeModerator.IJoin;
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: moderatorJoin,
  });
  typia.assert(moderator);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberJoin,
  });
  typia.assert(member);
  // 2. Create community
  const communityName = "test_community_" + RandomGenerator.alphaNumeric(8);
  const community = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: communityName,
    icon_url: null,
    created_at: new Date().toISOString(),
  } satisfies IRedditLikeCommunity.ISummary;
  // 3. Subscribe member to community
  const subscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      memberConnection,
      {
        communityName: communityName,
      },
    );
  typia.assert(subscription);
  // 4. Ban the user
  const banCreate = {
    reddit_like_user_id: member.id,
    reddit_like_community_id: community.id,
    status: "active" as const,
  } satisfies IRedditLikeBan.ICreate;
  const ban = await api.functional.redditLike.moderator.communities.bans.create(
    moderatorConnection,
    {
      communityId: community.id,
      body: banCreate,
    },
  );
  typia.assert(ban);
  // 5. Remove the ban
  await api.functional.redditLike.moderator.bans.erase(moderatorConnection, {
    banId: ban.id,
  });
}
