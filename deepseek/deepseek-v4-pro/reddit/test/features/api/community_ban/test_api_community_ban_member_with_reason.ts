import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityBan";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_member_communities_bans_create } from "../../../generate/generate_random_community_hub_member_communities_bans_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_community_ban } from "../../../prepare/prepare_random_community_hub_community_ban";

export async function test_api_community_ban_member_with_reason(
  connection: api.IConnection,
) {
  // 1. Register the target member who will be banned
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_member_join(targetConnection, {});
  // 2. Register and authenticate as the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 3. Create the community
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 4. Issue ban with a descriptive reason
  const reason = "Repeated violation of community guidelines";
  const ban =
    await generate_random_community_hub_member_communities_bans_create(
      ownerConnection,
      {
        body: { username: target.username, reason },
        params: { communityName: community.name },
      },
    );
  typia.assert(ban);
  // 5. Validate ban record
  TestValidator.equals("reason matches", ban.reason, reason);
  TestValidator.equals("banned member id", ban.bannedMember.id, target.id);
  TestValidator.equals(
    "banned member username",
    ban.bannedMember.username,
    target.username,
  );
  TestValidator.equals("community id", ban.community.id, community.id);
  TestValidator.equals("community name", ban.community.name, community.name);
  TestValidator.equals("issued by owner", ban.issuedBy.id, owner.id);
  TestValidator.equals("unbanned_at is null", ban.unbanned_at, null);
  TestValidator.equals("unbannedBy is null", ban.unbannedBy, null);
}
