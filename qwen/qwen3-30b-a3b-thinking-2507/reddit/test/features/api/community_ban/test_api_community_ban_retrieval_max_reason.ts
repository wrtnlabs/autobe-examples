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

export async function test_api_community_ban_retrieval_max_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate as member (update headers internally)
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    },
  });
  // 3. Create test community
  const community = await generate_random_reddit_member_communities_create(
    memberConnection,
    {
      body: {
        name: `test-community-${RandomGenerator.alphabets(8)}`,
      },
    },
  );
  typia.assert(community);
  // 4. Create ban with max reason (500 characters)
  const maxReason = "a".repeat(500);
  const ban = await generate_random_reddit_member_communities_bans_ban(
    memberConnection,
    {
      body: {
        community_id: community.id,
        user_id: typia.random<string & tags.Format<"uuid">>(),
        reason: maxReason,
      },
    },
  );
  typia.assert(ban);
  // 5. Retrieve the ban
  const retrievedBan = await api.functional.reddit.member.communities.bans.at(
    memberConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  typia.assert(retrievedBan);
  // 6. Validate the ban reason has exactly 500 characters
  TestValidator.equals("max reason length", retrievedBan.reason.length, 500);
}
