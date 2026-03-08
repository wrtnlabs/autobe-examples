import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_ban_create_ban } from "../../../generate/generate_random_reddit_like_member_communities_ban_create_ban";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_ban } from "../../../prepare/prepare_random_reddit_like_ban";
import { prepare_random_reddit_like_subscription } from "../../../prepare/prepare_random_reddit_like_subscription";

export async function test_api_community_member_ban_user(
  connection: api.IConnection,
): Promise<void> {
  // Create connections for different actors
  const ownerConnection: api.IConnection = { host: connection.host };
  const bannedConnection: api.IConnection = { host: connection.host };
  // 1. Register community owner
  const ownerUser: IRedditLikeMember.IAuthorized =
    await api.functional.redditLike.auth.member.join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "password123",
        display_name: "Community Owner",
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    });
  // Update owner connection with token from registration
  ownerConnection.headers = { Authorization: ownerUser.token.access };
  // 2. Register target user to be banned
  const bannedUser: IRedditLikeMember.IAuthorized =
    await api.functional.redditLike.auth.member.join(bannedConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "password123",
        display_name: "Banned User",
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    });
  // Get banned user token for later use
  const bannedToken = bannedUser.token.access;
  // 3. Use existing community or create one through subscription flow
  // For this test, we'll use a generic community name and assume it exists
  // In real scenario, owner would create community first
  const communityName = "test_community";
  // Subscribe owner to community (creates if doesn't exist or joins existing)
  const subscription =
    await api.functional.redditLike.member.subscriptions.create(
      ownerConnection,
      {
        body: {
          reddit_like_member_id: ownerUser.id,
          reddit_like_community_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          status: "subscribed",
        } satisfies IRedditLikeSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Execute ban operation
  const banResult =
    await api.functional.redditLike.member.communities.ban.createBan(
      ownerConnection,
      {
        communityName: communityName,
        username: bannedUser.username,
        body: {
          reddit_like_user_id: bannedUser.id,
          reddit_like_community_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          status: "active",
        } satisfies IRedditLikeBan.ICreate,
      },
    );
  typia.assert(banResult);
  // 5. Validate ban record
  TestValidator.equals("ban status is active", banResult.status, "active");
  TestValidator.equals(
    "ban user_id matches",
    banResult.reddit_like_user_id,
    bannedUser.id,
  );
  TestValidator.predicate("ban created_at is valid date", () => {
    try {
      new Date(banResult.created_at);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate("ban updated_at is valid date", () => {
    try {
      new Date(banResult.updated_at);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.equals("ban deleted_at is null", banResult.deleted_at, null);
}
