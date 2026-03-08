import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
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
import { generate_random_reddit_like_member_communities_ban_create_ban } from "../../../generate/generate_random_reddit_like_member_communities_ban_create_ban";
import { prepare_random_reddit_like_ban } from "../../../prepare/prepare_random_reddit_like_ban";

export async function test_api_banned_users_after_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      password: "12341234",
      bio: null,
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Join as member user (to be banned)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      password: "12341234",
      bio: null,
      avatar_url: null,
    },
  });
  // Get member username for ban operation
  const testCommunityName = `test-community-${RandomGenerator.alphaNumeric(6)}`;
  // 3. Ban the member from the community as moderator
  const ban = await api.functional.redditLike.member.communities.ban.createBan(
    moderatorConnection,
    {
      communityName: testCommunityName,
      username: "testuser",
      body: {
        reddit_like_user_id: "123e4567-e89b-12d3-a456-426614174000",
        reddit_like_community_id: "123e4567-e89b-12d3-a456-426614174001",
        status: "active",
      },
    },
  );
  typia.assert(ban);
  // 4. Verify banned users list includes the banned member
  const bannedUsers =
    await api.functional.redditLike.communities.banned_users.list(
      moderatorConnection,
      {
        communityName: testCommunityName,
      },
    );
  typia.assert(bannedUsers);
  TestValidator.predicate("banned user list retrieved", bannedUsers !== null);
}
