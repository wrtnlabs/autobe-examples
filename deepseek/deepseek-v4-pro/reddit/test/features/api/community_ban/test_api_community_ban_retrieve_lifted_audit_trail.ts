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
 * Verify that a community owner can retrieve a lifted ban record and that the complete audit trail is preserved.
 *
 * Tests the full ban lifecycle from creation through lifting to final retrieval. A member is banned from a community, the ban is subsequently lifted by the owner, and the now-lifted ban record is retrieved to verify that all audit-trail fields — unbanned_at, unbannedBy, bannedMember, issuedBy — are correctly populated and preserved.
 *
 * The key business rule under test is that ban records are preserved rather than deleted after lifting, enabling moderators to review the complete moderation history. Both active and lifted bans must be retrievable through the same endpoint.
 *
 * 1. A member account is created to serve as the banned user.
 * 2. An owner account is created separately, and the owner creates a community.
 * 3. The owner bans the member from the community, producing an active ban record.
 * 4. The owner lifts the ban, transitioning the record from active to lifted state with unbanned_at and unbannedBy populated.
 * 5. The owner retrieves the lifted ban by its ID.
 * 6. Validates that unbanned_at is non-null, unbannedBy matches the owner's profile (id, username, display_name), bannedMember identity is preserved, issuedBy identity is preserved, and the ban record id is unchanged.
 */
export async function test_api_community_ban_retrieve_lifted_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (to be banned)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create owner account
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
  // 4. Owner bans the member from the community
  const ban =
    await generate_random_community_hub_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { username: member.username },
      },
    );
  typia.assert(ban);
  // 5. Owner lifts the ban
  await api.functional.communityHub.member.communities.bans.erase(
    ownerConnection,
    {
      communityName: community.name,
      userId: member.id,
    },
  );
  // 6. Owner retrieves the lifted ban
  const liftedBan =
    await api.functional.communityHub.member.communities.bans.at(
      ownerConnection,
      {
        communityName: community.name,
        banId: ban.id,
      },
    );
  typia.assert(liftedBan);
  // 7. Validate audit trail — unbanned_at populated
  TestValidator.predicate(
    "ban has been lifted (unbanned_at populated)",
    liftedBan.unbanned_at !== null,
  );
  // 8. Validate unbannedBy contains owner's profile
  TestValidator.predicate("unbannedBy exists", liftedBan.unbannedBy !== null);
  if (liftedBan.unbannedBy) {
    TestValidator.equals(
      "unbannedBy id matches owner",
      liftedBan.unbannedBy.id,
      owner.id,
    );
    TestValidator.equals(
      "unbannedBy username matches owner",
      liftedBan.unbannedBy.username,
      owner.username,
    );
    TestValidator.equals(
      "unbannedBy display_name matches owner",
      liftedBan.unbannedBy.display_name,
      owner.display_name,
    );
  }
  // 9. Validate bannedMember identity preserved
  TestValidator.equals(
    "bannedMember id preserved",
    liftedBan.bannedMember.id,
    member.id,
  );
  TestValidator.equals(
    "bannedMember username preserved",
    liftedBan.bannedMember.username,
    member.username,
  );
  // 10. Validate issuedBy identity preserved
  TestValidator.equals(
    "issuedBy id preserved",
    liftedBan.issuedBy.id,
    owner.id,
  );
  // 11. Validate ban record preserved (not deleted)
  TestValidator.equals("ban id preserved", liftedBan.id, ban.id);
  TestValidator.equals(
    "community preserved",
    liftedBan.community.name,
    community.name,
  );
}
