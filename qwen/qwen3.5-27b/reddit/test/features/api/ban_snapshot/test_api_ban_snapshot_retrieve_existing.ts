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

export async function test_api_ban_snapshot_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving a ban snapshot that exists in the system.
   * 1. Create two member accounts (moderator and banned member)
   * 2. Create a community owned by the moderator
   * 3. Create a ban on the member (automatically creates snapshot)
   * 4. Retrieve and validate the ban snapshot with all denormalized data
   */
  // 1. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderator);
  // 2. Create banned member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 3. Create community (moderator becomes owner)
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
  // 4. Create ban on member by moderator (automatically creates snapshot)
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    moderatorConnection,
    {
      params: { communityId: community.id },
      body: {
        member_id: member.id,
        reason: "Violation of community guidelines",
      } satisfies IRedditCloneBan.ICreate,
    },
  );
  typia.assert(ban);
  // 5. Retrieve ban snapshot
  // Note: Using ban.id as snapshotId since snapshots are created alongside bans
  // and share the same identifier in this implementation
  const snapshot = await api.functional.redditClone.ban_snapshots.at(
    moderatorConnection,
    {
      snapshotId: ban.id,
    },
  );
  typia.assert(snapshot);
  // 6. Validate snapshot contains all denormalized data
  TestValidator.equals("snapshot id matches ban id", snapshot.id, ban.id);
  TestValidator.equals("ban reference id", snapshot.ban.id, ban.id);
  TestValidator.equals(
    "bannedBy is moderator",
    snapshot.bannedBy.id,
    moderator.id,
  );
  TestValidator.equals("member is banned user", snapshot.member.id, member.id);
  TestValidator.equals(
    "community matches",
    snapshot.community.id,
    community.id,
  );
  TestValidator.equals(
    "reason preserved",
    snapshot.reason,
    "Violation of community guidelines",
  );
  TestValidator.predicate(
    "banned_at timestamp exists",
    snapshot.banned_at != null,
  );
  TestValidator.equals(
    "lifted_at is null for active ban",
    snapshot.lifted_at,
    null,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    snapshot.created_at != null,
  );
}
