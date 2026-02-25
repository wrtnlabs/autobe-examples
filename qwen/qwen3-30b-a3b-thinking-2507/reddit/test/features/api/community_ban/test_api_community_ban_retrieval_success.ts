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

export async function test_api_community_ban_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as member
  const memberConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    },
  });
  // Create test community
  const community = await generate_random_reddit_member_communities_create(
    memberConnection,
    {},
  );
  // Create test ban within community
  const ban = await generate_random_reddit_member_communities_bans_ban(
    memberConnection,
    {
      params: { communityId: community.id },
    },
  );
  // Retrieve ban details
  const retrievedBan = await api.functional.reddit.member.communities.bans.at(
    memberConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  typia.assert(retrievedBan);
  // Validate ban details
  TestValidator.equals("reason matches", retrievedBan.reason, ban.reason);
  TestValidator.equals("user ID matches", retrievedBan.user.id, ban.user.id);
  TestValidator.equals(
    "created_at is present",
    retrievedBan.created_at.length,
    24,
  );
}
