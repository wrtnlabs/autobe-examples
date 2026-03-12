import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_bans_create } from "../../../generate/generate_random_reddit_clone_member_communities_bans_create";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_ban } from "../../../prepare/prepare_random_reddit_clone_ban";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test that a moderator can retrieve a lifted ban record for audit trail purposes.
 *
 * This test validates the audit trail functionality where ban records are preserved
 * for governance purposes even after being lifted. The scenario verifies:
 * 1. A ban was previously created and then lifted (lifted_at timestamp is set)
 * 2. The ban record remains in the database even after being lifted
 * 3. Moderators can still access lifted ban details to review moderation history
 * 4. The response includes the lifted_at timestamp indicating when the ban was removed
 * 5. All other ban metadata (reason, banned_at, member info) remains intact
 */
export async function test_api_ban_retrieve_lifted_for_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator (community owner)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 2. Create a community where moderator is the owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Authenticate as a second member (to be banned)
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(bannedMemberAuth);
  // 4. As moderator, create a ban for the second member
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    moderatorConnection,
    {
      params: { communityId: community.id },
      body: {
        member_id: bannedMemberAuth.id,
        reason: banReason,
      } satisfies IRedditCloneBan.ICreate,
    },
  );
  typia.assert(ban);
  // Verify initial ban state
  TestValidator.equals("ban reason preserved", ban.reason, banReason);
  TestValidator.equals(
    "banned member matches",
    ban.member.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals("community matches", ban.community.id, community.id);
  TestValidator.predicate("ban is active (not lifted)", ban.lifted_at === null);
  const bannedAt = ban.banned_at;
  // 5. As moderator, lift the ban (DELETE endpoint)
  await api.functional.redditClone.member.communities.bans.erase(
    moderatorConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  // 6. As moderator, retrieve the lifted ban record
  const liftedBan = await api.functional.redditClone.communities.bans.at(
    moderatorConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  typia.assert(liftedBan);
  // 7. Validate that the ban record exists with lifted_at timestamp set
  TestValidator.predicate("lifted_at is set", liftedBan.lifted_at !== null);
  // 8. Validate that all original ban metadata is preserved
  TestValidator.equals("ban ID preserved", liftedBan.id, ban.id);
  TestValidator.equals("reason preserved", liftedBan.reason, banReason);
  TestValidator.equals("banned_at preserved", liftedBan.banned_at, bannedAt);
  TestValidator.equals(
    "banned member preserved",
    liftedBan.member.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals(
    "community preserved",
    liftedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "member username preserved",
    liftedBan.member.username,
    bannedMemberAuth.username,
  );
  TestValidator.equals(
    "community name preserved",
    liftedBan.community.name,
    community.name,
  );
  // Validate that lifted_at is after banned_at (chronological order)
  TestValidator.predicate(
    "lifted_at is after banned_at",
    new Date(liftedBan.lifted_at!).getTime() > new Date(bannedAt).getTime(),
  );
}
