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
 * Test that a non-moderator, non-owner member cannot lift a community ban.
 *
 * Validates that the ban-lifting authorization is strictly scoped to community moderators and the community owner. A third-party member with no governance role in the community attempts to lift an active ban on another member and is rejected with a 403 Forbidden response, confirming that regular members cannot interfere with moderation actions.
 *
 * 1. Member A registers on the platform (will be banned by the owner).
 * 2. Owner registers and creates a new community.
 * 3. Owner bans Member A from the community, creating an active ban record.
 * 4. Member B registers — a third-party member with no ownership or moderator role.
 * 5. Member B attempts to lift Member A's ban and receives 403 Forbidden.
 */
export async function test_api_ban_lift_by_non_moderator_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A (to be banned)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Register Owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 3. Owner creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 4. Owner bans Member A
  const ban =
    await generate_random_community_hub_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { username: memberA.username },
      },
    );
  typia.assert(ban);
  // 5. Register Member B (non-owner, non-moderator)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 6. Member B attempts to lift the ban → expect 403
  await TestValidator.error(
    "non-moderator cannot lift a ban",
    async () =>
      await api.functional.communityHub.member.communities.bans.erase(
        memberBConnection,
        {
          communityName: community.name,
          userId: ban.bannedMember.id,
        },
      ),
  );
}
