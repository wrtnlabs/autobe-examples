import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_community_ban_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register community member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create community as owner
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Retrieve ban details for owner user in the community
  const banResponse = await api.functional.community.member.communities.bans.at(
    memberConnection,
    {
      communityId: community.id,
      userId: member.id,
    },
  );
  typia.assert(banResponse);
  // 4. Validate ban details
  TestValidator.equals("banned user ID", banResponse.user?.id, member.id);
  TestValidator.predicate("ban reason exists", banResponse.reason !== null);
  TestValidator.predicate(
    "banned at is date",
    new Date(banResponse.banned_at).toISOString() === banResponse.banned_at,
  );
}
