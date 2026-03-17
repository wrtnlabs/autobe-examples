import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
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

export async function test_api_ban_creation_by_owner_against_regular_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the first member (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuthorized);
  // 2. Create a community — the owner becomes the owner automatically
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Register the second member (ban target)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuthorized = await authorize_member_join(targetConnection, {});
  typia.assert(targetAuthorized);
  // 4. Have the target member subscribe to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      targetConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 5. Owner bans the target member
  const banReason = "Repeated violation of community rules";
  const ban = await generate_random_community_member_communities_bans_create(
    ownerConnection,
    {
      body: {
        banned_member_id: targetAuthorized.id,
        reason: banReason,
      },
      params: {
        communityId: community.id,
      },
    },
  );
  typia.assert(ban);
  // 6. Validate business rules
  TestValidator.equals("community id matches", ban.community.id, community.id);
  TestValidator.equals(
    "banned member id matches",
    ban.bannedMember.id,
    targetAuthorized.id,
  );
  TestValidator.equals(
    "issuing moderator id matches owner",
    ban.issuingModerator.id,
    ownerAuthorized.id,
  );
  TestValidator.equals("reason matches", ban.reason, banReason);
  TestValidator.equals("status is active", ban.status, "active");
  TestValidator.equals("lifted_at is null", ban.lifted_at, null);
}
