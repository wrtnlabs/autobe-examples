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
 * Test ban status update from active to removed workflow.
 *
 * Validates the complete ban lifecycle where a community owner creates an active ban against a member and then lifts the ban by updating the status to 'removed'. Ensures that the ban record persists with the updated status while maintaining all other fields intact.
 *
 * The test verifies that status transitions work correctly, timestamps are properly updated, and the reason field remains unchanged during the update operation.
 *
 * 1. Owner member registers and authenticates.
 * 2. Owner creates a new community (automatically becomes owner).
 * 3. Banned member registers as a separate account.
 * 4. Owner creates an active ban against the banned member in the community.
 * 5. Owner updates the ban status from 'active' to 'removed'.
 * 6. Validates the updated ban has status 'removed' and updated_at is newer than created_at.
 * 7. Validates the reason field remains unchanged from the original ban.
 */
export async function test_api_ban_update_status_to_removed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner
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
  // 2. Create community (owner becomes community owner)
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a second member who will be banned
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
  // 4. Create an active ban against the banned member
  const ban =
    await generate_random_reddit_community_member_communities_bans_create(
      ownerConnection,
      {
        body: {
          reddit_community_member_id: bannedMemberAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        } satisfies IRedditCommunityBan.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(ban);
  // Validate initial ban state
  TestValidator.equals("ban status is active", ban.status, "active");
  TestValidator.equals(
    "ban member matches",
    ban.member.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals("ban community matches", ban.community.id, community.id);
  TestValidator.equals("ban issuer matches owner", ban.issuer.id, ownerAuth.id);
  // 5. Update ban status from 'active' to 'removed'
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
  // 6. Validate updated ban has status 'removed'
  TestValidator.equals("ban status is removed", updatedBan.status, "removed");
  // 7. Validate updated_at is newer than created_at
  const createdAt = new Date(ban.created_at).getTime();
  const updatedAt = new Date(updatedBan.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is newer than created_at",
    updatedAt > createdAt,
  );
  // 8. Validate reason field remains unchanged
  TestValidator.equals("reason unchanged", updatedBan.reason, ban.reason);
  // 9. Validate other fields remain intact
  TestValidator.equals("member unchanged", updatedBan.member.id, ban.member.id);
  TestValidator.equals("issuer unchanged", updatedBan.issuer.id, ban.issuer.id);
  TestValidator.equals(
    "community unchanged",
    updatedBan.community.id,
    ban.community.id,
  );
}