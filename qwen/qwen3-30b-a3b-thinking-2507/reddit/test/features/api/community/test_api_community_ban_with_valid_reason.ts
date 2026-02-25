import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_member_communities_bans_ban } from "../../../generate/generate_random_reddit_member_communities_bans_ban";
import { generate_random_reddit_member_communities_create } from "../../../generate/generate_random_reddit_member_communities_create";
import { prepare_random_reddit_community } from "../../../prepare/prepare_random_reddit_community";
import { prepare_random_reddit_community_ban } from "../../../prepare/prepare_random_reddit_community_ban";

export async function test_api_community_ban_with_valid_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up owner user with join
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@example.com`,
      password: "password123",
      username: `owner${RandomGenerator.alphabets(5)}`,
    },
  });
  // 2. Create base community
  const community =
    await generate_random_reddit_member_communities_create(ownerConnection, {});
  // 3. Prepare ban data
  const targetUserId = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.alphabets(50);
  // 4. Ban the user
  const ban = await generate_random_reddit_member_communities_bans_ban(
    ownerConnection,
    {
      params: { communityId: community.id },
      body: {
        community_id: community.id,
        user_id: targetUserId,
        reason: reason,
      },
    },
  );
  typia.assert(ban);
  // 5. Validate ban record
  TestValidator.equals("Community ID matches", ban.community.id, community.id);
  TestValidator.equals("User ID matches", ban.user.id, targetUserId);
  TestValidator.equals("Reason matches", ban.reason, reason);
}