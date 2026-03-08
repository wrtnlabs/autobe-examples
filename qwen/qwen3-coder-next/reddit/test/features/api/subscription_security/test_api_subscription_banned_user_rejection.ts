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
import { prepare_random_reddit_like_ban } from "../../../prepare/prepare_random_reddit_like_ban";

export async function test_api_subscription_banned_user_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create banned member account
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(bannedMember);
  // Step 2: Create separate authenticated session for banning (admin/moderator role)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: "admin_" + RandomGenerator.alphaNumeric(6),
      password: "1234",
      display_name: "Admin User",
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(admin);
  // Step 3: Ban the member from the community using the ban API
  const banBody: IRedditLikeBan.ICreate = {
    reddit_like_user_id: bannedMember.id,
    reddit_like_community_id: typia.random<string & tags.Format<"uuid">>(),
    status: "active",
  };
  // Use the ban endpoint to ban the user from the pre-existing community
  const banResult =
    await api.functional.redditLike.member.communities.ban.createBan(
      adminConnection,
      {
        communityName: "test-community",
        username: bannedMember.username,
        body: banBody,
      },
    );
  typia.assert(banResult);
  // Step 4: Attempt to subscribe as banned user - should fail
  await TestValidator.error(
    "banned user should be rejected from subscribing",
    async () => {
      await api.functional.redditLike.member.communities.subscribe.create(
        bannedMemberConnection,
        { communityName: "test-community" },
      );
    },
  );
  // Step 5: Verify the ban record has active status
  TestValidator.predicate(
    "ban record has active status",
    () => banResult.status === "active",
  );
}
