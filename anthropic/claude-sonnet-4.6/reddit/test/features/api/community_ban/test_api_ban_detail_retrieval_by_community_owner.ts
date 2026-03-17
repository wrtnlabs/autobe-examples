import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_bans_create } from "../../../generate/generate_random_community_member_communities_bans_create";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_ban } from "../../../prepare/prepare_random_community_ban";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_ban_detail_retrieval_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register owner member and get authenticated connection
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerMember = await authorize_member_join(ownerConnection, {});
  // ownerConnection.headers is now set with Authorization token
  // Step 2: Create a community as the owner
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Register a second member (the ban target)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetConnection, {});
  // Step 4: Issue a ban against the second member as the owner
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const ban = await generate_random_community_member_communities_bans_create(
    ownerConnection,
    {
      params: { communityId: community.id },
      body: {
        banned_member_id: targetMember.id,
        reason: banReason,
      },
    },
  );
  typia.assert(ban);
  // Step 5: Retrieve the ban detail using the owner's connection
  const banDetail = await api.functional.community.member.communities.bans.at(
    ownerConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  typia.assert(banDetail);
  // Step 6: Validate business logic
  TestValidator.equals("ban id matches", banDetail.id, ban.id);
  TestValidator.equals(
    "community id matches",
    banDetail.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    banDetail.community.name,
    community.name,
  );
  TestValidator.equals(
    "banned member id matches",
    banDetail.bannedMember.id,
    targetMember.id,
  );
  TestValidator.equals(
    "banned member username matches",
    banDetail.bannedMember.username,
    targetMember.username,
  );
  TestValidator.equals(
    "issuing moderator id matches",
    banDetail.issuingModerator.id,
    ownerMember.id,
  );
  TestValidator.equals(
    "issuing moderator username matches",
    banDetail.issuingModerator.username,
    ownerMember.username,
  );
  TestValidator.equals("ban reason matches", banDetail.reason, banReason);
  TestValidator.equals("ban status is active", banDetail.status, "active");
  TestValidator.equals("ban lifted_at is null", banDetail.lifted_at, null);
}
