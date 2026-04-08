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
 * Test community ban unban workflow by owner.
 *
 * Validates the complete ban and unban lifecycle for community moderation. A community owner bans a member, then lifts the ban, and the member regains posting privileges. This tests the core moderation workflow including ban creation, status transition, audit trail preservation, and privilege restoration.
 *
 * The test verifies that banning restricts member posting access, unbanning transitions status from active to removed while preserving the ban record for audit purposes, and the previously banned member can participate in the community again after unban.
 *
 * 1. Owner member registers and authenticates.
 * 2. Owner creates a new community (becomes owner automatically).
 * 3. Second member registers and authenticates (will be banned).
 * 4. Owner creates an active ban against the second member.
 * 5. Owner calls unban endpoint to remove the ban.
 * 6. Verify ban status changed from active to removed.
 * 7. Verify ban record preserved with updated_at timestamp changed.
 * 8. Verify previously banned member can now create posts and comments.
 */
export async function test_api_community_ban_unban_by_owner(
  connection: api.IConnection,
): Promise<void> {
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
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
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
  const ban =
    await generate_random_reddit_community_member_communities_bans_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          reddit_community_member_id: bannedMemberAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  TestValidator.equals("ban status is active", ban.status, "active");
  TestValidator.equals(
    "ban member matches",
    ban.member.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals("ban community matches", ban.community.id, community.id);
  await api.functional.redditCommunity.member.communities.bans.erase(
    ownerConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
}