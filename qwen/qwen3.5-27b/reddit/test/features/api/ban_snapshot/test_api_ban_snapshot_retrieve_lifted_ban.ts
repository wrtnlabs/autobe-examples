import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanSnapshot";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
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
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_ban } from "../../../prepare/prepare_random_reddit_clone_ban";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

/**
 * Test retrieving a ban snapshot for a ban that has been lifted.
 * 1. Create moderator and banned member accounts
 * 2. Create a community owned by the moderator
 * 3. Create a ban on the banned member
 * 4. Lift the ban (creates snapshot with lifted_at)
 * 5. Retrieve the ban snapshot and verify lifted_at is populated
 * 6. Confirm all snapshot data remains intact
 */
export async function test_api_ban_snapshot_retrieve_lifted_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator member account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderator);
  // 2. Create banned member account
  const bannedConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(bannedMember);
  // 3. Create community owned by moderator
  const community =
    await generate_random_reddit_clone_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 4. Create ban on banned member
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    moderatorConnection,
    {
      params: {
        communityId: community.id,
      },
      body: {
        member_id: bannedMember.id,
        reason: "Violation of community guidelines",
      },
    },
  );
  typia.assert(ban);
  // 5. Lift the ban (creates snapshot with lifted_at)
  await api.functional.redditClone.member.communities.bans.erase(
    moderatorConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  // 6. Retrieve ban snapshot
  // Note: In a real scenario, we would need to track the snapshot ID separately
  // or have an endpoint to list snapshots for a ban. For this test, we assume
  // the snapshot ID is the same as the ban ID or can be derived from it.
  const snapshot = await api.functional.redditClone.ban_snapshots.at(
    moderatorConnection,
    {
      snapshotId: ban.id,
    },
  );
  typia.assert(snapshot);
  // 7. Verify lifted_at is populated
  TestValidator.predicate(
    "lifted_at should be populated after ban is lifted",
    snapshot.lifted_at !== null,
  );
  // 8. Verify banned_at is still present
  TestValidator.predicate(
    "banned_at should remain intact",
    snapshot.banned_at !== undefined,
  );
  // 9. Verify moderator information
  TestValidator.equals(
    "bannedBy should match moderator",
    snapshot.bannedBy.id,
    moderator.id,
  );
  // 10. Verify banned member information
  TestValidator.equals(
    "member should match banned member",
    snapshot.member.id,
    bannedMember.id,
  );
  // 11. Verify community information
  TestValidator.equals(
    "community should match the community",
    snapshot.community.id,
    community.id,
  );
  // 12. Verify ban reason is preserved
  TestValidator.equals(
    "reason should be preserved",
    snapshot.reason,
    "Violation of community guidelines",
  );
  // 13. Verify timestamps are valid dates
  TestValidator.predicate(
    "banned_at should be a valid datetime",
    !isNaN(Date.parse(snapshot.banned_at)),
  );
  if (snapshot.lifted_at !== null) {
    TestValidator.predicate(
      "lifted_at should be a valid datetime",
      !isNaN(Date.parse(snapshot.lifted_at)),
    );
    TestValidator.predicate(
      "lifted_at should be after banned_at",
      new Date(snapshot.lifted_at) > new Date(snapshot.banned_at),
    );
  }
}
