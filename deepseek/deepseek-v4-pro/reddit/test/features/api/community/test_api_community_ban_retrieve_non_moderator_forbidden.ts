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
 * Test that a non-moderator, non-owner member cannot retrieve ban details from a community they do not govern.
 *
 * Validates the authorization boundary for the ban detail retrieval endpoint. Ban records contain sensitive moderation information — the banned member's identity, the issuing moderator, the reason, and unban audit data — and must only be accessible to members holding moderator or owner authority within the community where the ban was issued.
 *
 * Moderator authority is strictly scoped to the community where the role is held. A member who is neither a moderator nor the owner of a community should receive a 403 Forbidden response when attempting to access ban records, regardless of their standing in other communities.
 *
 * 1. A member (to-be-banned) registers and authenticates.
 * 2. A community owner registers, authenticates, and creates a community.
 * 3. The owner bans the first member from the community, producing a ban record.
 * 4. A third member with no governance role in the community registers and authenticates.
 * 5. The third member attempts to retrieve the ban record by its ID.
 * 6. Validates that the response is 403 Forbidden, confirming ban detail access is restricted to moderators and the community owner only.
 */
export async function test_api_community_ban_retrieve_non_moderator_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create the member who will be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {});
  typia.assert(bannedMember);
  // 2. Create and authenticate the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 3. Owner creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 4. Owner bans the first member from the community
  const ban =
    await generate_random_community_hub_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { username: bannedMember.username },
      },
    );
  typia.assert(ban);
  // 5. Create a third member with no governance role in the community
  const thirdMemberConnection: api.IConnection = { host: connection.host };
  const thirdMember = await authorize_member_join(thirdMemberConnection, {});
  typia.assert(thirdMember);
  // 6. Third member (non-moderator, non-owner) attempts to retrieve ban → 403
  await TestValidator.httpError(
    "non-moderator cannot retrieve ban details",
    403,
    async () =>
      await api.functional.communityHub.member.communities.bans.at(
        thirdMemberConnection,
        {
          communityName: community.name,
          banId: ban.id,
        },
      ),
  );
}
