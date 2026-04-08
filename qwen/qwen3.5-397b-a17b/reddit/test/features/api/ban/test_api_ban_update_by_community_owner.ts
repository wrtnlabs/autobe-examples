import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_bans_create } from "../../../generate/generate_random_reddit_community_member_communities_bans_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_ban } from "../../../prepare/prepare_random_reddit_community_ban";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test that a community owner has authority to update ban records in their community.
 *
 * Validates the complete ban management workflow for community owners, including member authentication, community creation, ban creation, and ban update operations. Ensures that community owners possess full administrative authority for ban management equivalent to moderator privileges.
 *
 * The test establishes ownership at community creation time and verifies that the owner can successfully create and update ban records within their community. The ban status transition from 'active' to 'removed' is validated along with issuer field preservation.
 *
 * 1. Member registers and authenticates as community owner.
 * 2. Owner creates a new community with unique name and metadata.
 * 3. Owner creates a ban record in the owned community with 'active' status.
 * 4. Owner updates the ban status from 'active' to 'removed'.
 * 5. Validates update response contains complete ban details with correct status.
 * 6. Validates issuer field matches the original owner who created the ban.
 */
export async function test_api_ban_update_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member who will be the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create a new community (member becomes owner automatically)
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create another member to be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(bannedMemberAuth);
  // 4. Create a ban in the owned community with status 'active'
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const ban =
    await generate_random_reddit_community_member_communities_bans_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          reddit_community_member_id: bannedMemberAuth.id,
          reason: banReason,
          status: "active",
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 5. As the same owner, update the ban status to 'removed'
  const updatedBan =
    await api.functional.redditCommunity.member.communities.bans.update(
      ownerConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          status: "removed",
        } satisfies IRedditCommunityBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // 6. Validate the update succeeded with correct status
  TestValidator.equals("ban status updated", updatedBan.status, "removed");
  TestValidator.equals("ban id preserved", updatedBan.id, ban.id);
  TestValidator.equals(
    "community id preserved",
    updatedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "banned member preserved",
    updatedBan.member.id,
    bannedMemberAuth.id,
  );
  // 7. Validate the issuer field still shows the original issuer (the owner)
  TestValidator.equals("issuer is owner", updatedBan.issuer.id, ownerAuth.id);
  TestValidator.equals(
    "issuer username matches",
    updatedBan.issuer.username,
    ownerAuth.username,
  );
  // 8. Validate reason remains unchanged when only status is updated
  TestValidator.equals("reason unchanged", updatedBan.reason, banReason);
  // 9. Validate updated_at timestamp reflects the update operation
  TestValidator.predicate(
    "updated_at after created_at",
    new Date(updatedBan.updated_at).getTime() >=
      new Date(ban.created_at).getTime(),
  );
}
