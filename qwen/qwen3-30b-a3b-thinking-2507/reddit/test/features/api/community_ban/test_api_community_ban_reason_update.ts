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

export async function test_api_community_ban_reason_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(),
    },
  });
  // 2. Create community as owner
  const community = await generate_random_reddit_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 3. Create ban record
  const ban = await generate_random_reddit_member_communities_bans_ban(
    memberConnection,
    {
      params: { communityId: community.id },
    },
  );
  typia.assert(ban);
  // 4. Update ban reason
  const newReason = RandomGenerator.paragraph({ sentences: 2 });
  const updatedBan = await api.functional.reddit.member.communities.bans.update(
    memberConnection,
    {
      communityId: community.id,
      banId: ban.id,
      body: {
        reason: newReason,
      } satisfies IRedditCommunityBan.IUpdate,
    },
  );
  typia.assert(updatedBan);
  // Validate business logic
  TestValidator.equals("ban reason updated", updatedBan.reason, newReason);
}
