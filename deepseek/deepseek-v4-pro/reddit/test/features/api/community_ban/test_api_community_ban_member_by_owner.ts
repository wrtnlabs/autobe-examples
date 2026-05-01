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

/**
 * Test community owner banning a member from their community.
 *
 * Validates the complete ban lifecycle initiated by a community owner against a target member. The owner registers first, creates a community, then issues a ban against a separately registered target member via the bans endpoint using the target's username.
 *
 * The ban record is verified to contain the correct banned member identity matching the target, the correct community, the owner as the issuing moderator, a null reason, and active status confirmed by both unbanned_at and unbannedBy being null.
 *
 * 1. Register the target member (who will be banned) via authorize_member_join.
 * 2. Register and authenticate the community owner via authorize_member_join.
 * 3. Owner creates a community via generate_random_community_hub_member_communities_create.
 * 4. Owner bans the target member by username using generate_random_community_hub_member_communities_bans_create.
 * 5. Validate the ban record: bannedMember.id, community.id, issuedBy.id, reason is null, unbanned_at is null, unbannedBy is null.
 */
export async function test_api_community_ban_member_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the target member (who will be banned)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetConnection, {});
  // 2. Register and authenticate the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 3. Create the community
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  // 4. Owner bans the target member
  const ban =
    await generate_random_community_hub_member_communities_bans_create(
      ownerConnection,
      {
        body: {
          username: targetMember.username,
          reason: null,
        },
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(ban);
  // 5. Validate the ban record
  TestValidator.equals(
    "banned member id matches target",
    ban.bannedMember.id,
    targetMember.id,
  );
  TestValidator.equals("community id matches", ban.community.id, community.id);
  TestValidator.equals("issued by owner", ban.issuedBy.id, owner.id);
  TestValidator.equals("reason is null", ban.reason, null);
  TestValidator.equals(
    "unbanned_at is null (active ban)",
    ban.unbanned_at,
    null,
  );
  TestValidator.equals("unbannedBy is null (active ban)", ban.unbannedBy, null);
}
