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
 * Test that a community owner can successfully lift an active ban on a member.
 *
 * Validates the complete ban-unban lifecycle governed by the community owner. The owner creates a community, issues a ban against a registered member, and then lifts that ban through the unban endpoint. The test confirms that the ban record is in an active state before lifting — with unbanned_at and unbannedBy both null — and that the unban operation completes successfully without errors.
 *
 * 1. Register a member who will later be banned and unbanned.
 * 2. Register another member who will serve as the community owner.
 * 3. Owner creates a community to establish governance scope.
 * 4. Owner bans the first member, verifying the ban record reflects active state.
 * 5. Owner lifts the ban via the erase endpoint.
 */
export async function test_api_ban_lift_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register banned member
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {});
  // 2. Register owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 3. Owner creates community
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 4. Owner bans the member
  const ban =
    await generate_random_community_hub_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { username: bannedMember.username },
      },
    );
  typia.assert(ban);
  // Validate ban is active before lifting
  TestValidator.equals("ban is active", ban.unbanned_at, null);
  TestValidator.equals("unbannedBy is null", ban.unbannedBy, null);
  // 5. Owner lifts the ban
  await api.functional.communityHub.member.communities.bans.erase(
    ownerConnection,
    {
      communityName: community.name,
      userId: bannedMember.id,
    },
  );
}
