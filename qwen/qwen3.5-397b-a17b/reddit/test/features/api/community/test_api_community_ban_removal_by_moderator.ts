import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
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
import { generate_random_reddit_community_member_communities_moderators_create } from "../../../generate/generate_random_reddit_community_member_communities_moderators_create";
import { prepare_random_reddit_community_ban } from "../../../prepare/prepare_random_reddit_community_ban";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";

/**
 * Test that a moderator can remove a ban they issued in their community.
 *
 * This test verifies the hierarchical ban management authority where moderators
 * can unban users they previously banned from their community.
 *
 * Test Flow:
 * 1. Create community owner account and community
 * 2. Create moderator account and add to community
 * 3. Create member account to be banned
 * 4. Moderator bans the member
 * 5. Moderator removes the ban they issued
 * 6. Verify ban removal by successfully re-banning the same user
 */
export async function test_api_community_ban_removal_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);
  // 3. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 4. Add moderator to community (owner adds moderator)
  const moderatorRecord =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName },
        body: {
          member_id: moderatorAuth.id,
        } satisfies IRedditCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorRecord);
  TestValidator.equals(
    "moderator member matches",
    moderatorRecord.member.id,
    moderatorAuth.id,
  );
  // 5. Create member account to be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(bannedMemberAuth);
  // 6. Moderator bans the member from the community
  const ban =
    await generate_random_reddit_community_member_communities_bans_create(
      moderatorConnection,
      {
        params: { communityName },
        body: {
          reddit_community_member_id: bannedMemberAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  TestValidator.equals(
    "banned member matches",
    ban.bannedMember.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals(
    "ban issued by moderator",
    ban.bannedBy.id,
    moderatorAuth.id,
  );
  TestValidator.predicate(
    "ban is active (not deleted)",
    ban.deleted_at === null,
  );
  // 7. Verify ban community association
  TestValidator.equals("ban community matches", ban.community.id, community.id);
  // 8. Moderator removes the ban they issued
  await api.functional.redditCommunity.member.communities.bans.erase(
    moderatorConnection,
    {
      communityName,
      userId: bannedMemberAuth.id,
    },
  );
  // 9. Verify ban removal by successfully re-banning the same user
  // If the ban was properly soft-deleted, we should be able to ban again
  const newBan =
    await generate_random_reddit_community_member_communities_bans_create(
      moderatorConnection,
      {
        params: { communityName },
        body: {
          reddit_community_member_id: bannedMemberAuth.id,
          reason: "Re-banned after unban test",
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(newBan);
  TestValidator.notEquals("new ban has different id", newBan.id, ban.id);
  TestValidator.predicate("new ban is active", newBan.deleted_at === null);
}
