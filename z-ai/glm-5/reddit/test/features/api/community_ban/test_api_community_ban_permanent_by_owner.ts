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

export async function test_api_community_ban_permanent_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create a community (owner automatically becomes moderator with is_owner=true)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Create target member account
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_member_join(targetConnection, {});
  typia.assert(target);
  // 4. Target user subscribes to the community
  const subscription =
    await api.functional.community.member.communities.subscribe(
      targetConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 5. Owner bans the target user with a reason (permanent ban - no expiration)
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const ban = await api.functional.community.member.communities.bans.create(
    ownerConnection,
    {
      communityName: community.name,
      body: {
        username: target.username,
        reason: banReason,
      } satisfies ICommunityBan.ICreate,
    },
  );
  typia.assert(ban);
  // 6. Validate ban properties
  TestValidator.equals("ban community matches", ban.community.id, community.id);
  TestValidator.equals("banned member matches", ban.member.id, target.id);
  TestValidator.equals("banned by matches owner", ban.bannedBy.id, owner.id);
  TestValidator.equals("reason matches input", ban.reason, banReason);
  TestValidator.equals(
    "permanent ban has null expiration",
    ban.expiredAt,
    null,
  );
  TestValidator.predicate("createdAt is set", !!ban.createdAt);
  TestValidator.predicate("updatedAt is set", !!ban.updatedAt);
}
