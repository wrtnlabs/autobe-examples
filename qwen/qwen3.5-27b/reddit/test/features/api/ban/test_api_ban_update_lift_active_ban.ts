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
 * Test lifting an active ban by updating the lifted_at timestamp.
 *
 * This test verifies the complete workflow of:
 * 1. Creating a community and banning a member
 * 2. Updating the ban record to lift the ban
 * 3. Validating the ban record is updated correctly with lifted_at timestamp
 */
export async function test_api_ban_update_lift_active_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate as community owner (member1)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: undefined,
  });
  typia.assert(ownerAuth);
  // 2. Setup: Create a community owned by member1
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: undefined,
      },
    );
  typia.assert(community);
  // 3. Setup: Authenticate as second member (member2) to be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: undefined,
  });
  typia.assert(bannedMemberAuth);
  // 4. Setup: Create a ban record for member2 in the community
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    ownerConnection,
    {
      params: {
        communityId: community.id,
      },
      body: {
        member_id: bannedMemberAuth.id,
        reason: "Violating community guidelines",
      },
    },
  );
  typia.assert(ban);
  // Store original ban state for validation
  const originalBannedAt = ban.banned_at;
  const originalLiftedAt = ban.lifted_at;
  // Verify initial state: ban is active (lifted_at is null)
  TestValidator.equals("initial lifted_at is null", originalLiftedAt, null);
  // 5. Test: Update the ban record to lift the ban
  // Create a lifted_at timestamp that is after the banned_at timestamp
  const liftedAtTimestamp = new Date(
    new Date(originalBannedAt).getTime() + 60000,
  ).toISOString();
  const updatedBan =
    await api.functional.redditClone.member.communities.bans.update(
      ownerConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          lifted_at: liftedAtTimestamp,
        } satisfies IRedditCloneBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // 6. Validation: Verify the ban record is updated correctly
  TestValidator.equals(
    "lifted_at is set",
    updatedBan.lifted_at,
    liftedAtTimestamp,
  );
  TestValidator.predicate(
    "lifted_at is not null",
    updatedBan.lifted_at !== null,
  );
  TestValidator.predicate(
    "lifted_at is after banned_at",
    new Date(updatedBan.lifted_at!).getTime() >
      new Date(updatedBan.banned_at).getTime(),
  );
  // 7. Validation: Verify updated_at timestamp was refreshed
  TestValidator.predicate(
    "updated_at is after original created_at",
    new Date(updatedBan.updated_at).getTime() >=
      new Date(ban.created_at).getTime(),
  );
  // 8. Validation: Verify ban record still exists (not deleted) for audit purposes
  TestValidator.equals("ban record still exists", updatedBan.deleted_at, null);
  TestValidator.equals(
    "ban member unchanged",
    updatedBan.member.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals(
    "ban community unchanged",
    updatedBan.community.id,
    community.id,
  );
}
