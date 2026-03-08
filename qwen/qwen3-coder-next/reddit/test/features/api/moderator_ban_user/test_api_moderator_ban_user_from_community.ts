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
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { generate_random_reddit_like_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_like_moderator_communities_bans_create";
import { prepare_random_reddit_like_ban } from "../../../prepare/prepare_random_reddit_like_ban";
import { prepare_random_reddit_like_subscription } from "../../../prepare/prepare_random_reddit_like_subscription";

export async function test_api_moderator_ban_user_from_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator registration and login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoin = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      password: "1234",
      bio: null,
      avatar_url: null,
      href: "https://example.com",
      referrer: "https://referrer.com",
    } satisfies IRedditLikeModerator.IJoin,
  });
  const moderatorLogin = await authorize_moderator_login(moderatorConnection, {
    body: {
      email: typia.assert<string & tags.MaxLength<255> & tags.Format<"email">>(moderatorJoin.email),
      password: "1234",
    } satisfies IRedditLikeModerator.ILogin,
  });
  typia.assert(moderatorLogin);
  // 2. Create test member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: typia.assert<string & tags.MaxLength<255> & tags.Format<"email">>(memberJoin.email),
      password: "1234",
    } satisfies IRedditLikeMember.ILogin,
  });
  // 3. Generate random community ID for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 4. Member subscribes to the community
  await generate_random_reddit_like_member_subscriptions_create(
    memberConnection,
    {
      body: {
        reddit_like_member_id: memberJoin.id,
        reddit_like_community_id: communityId,
      } satisfies IRedditLikeSubscription.ICreate,
    },
  );
  // 5. Moderator bans the member from the community
  const ban =
    await generate_random_reddit_like_moderator_communities_bans_create(
      moderatorConnection,
      {
        params: { communityId: communityId },
        body: {
          reddit_like_user_id: memberJoin.id,
          reddit_like_community_id: communityId,
          status: "active" satisfies IRedditLikeBan.ICreate["status"],
        } satisfies IRedditLikeBan.ICreate,
      },
    );
  typia.assert(ban);
  // 6. Validate ban record
  TestValidator.equals(
    "ban user_id matches",
    ban.reddit_like_user_id,
    memberJoin.id,
  );
  TestValidator.equals(
    "ban community_id matches",
    ban.reddit_like_community_id,
    communityId,
  );
  TestValidator.equals("ban status is active", ban.status, "active");
  TestValidator.predicate("ban has timestamp", ban.created_at !== undefined);
}