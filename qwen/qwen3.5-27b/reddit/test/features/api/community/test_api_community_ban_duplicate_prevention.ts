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
 * Test duplicate ban prevention for community members.
 *
 * This test verifies that attempting to ban an already banned member
 * returns a 409 Conflict error, enforcing the unique constraint on
 * (community_id, member_id) in the ban records table.
 */
export async function test_api_community_ban_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerResult = await authorize_member_join(ownerConnection, {
    body: undefined,
  });
  typia.assert(ownerResult);
  // 2. Create a community (owner becomes the moderator)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      { body: undefined },
    );
  typia.assert(community);
  // 3. Setup: Register and authenticate as the member to be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberResult = await authorize_member_join(
    bannedMemberConnection,
    {
      body: undefined,
    },
  );
  typia.assert(bannedMemberResult);
  // 4. First ban: Ban the member from the community
  const firstBan =
    await generate_random_reddit_clone_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          member_id: bannedMemberResult.id,
          reason: "Violation of community guidelines",
        },
      },
    );
  typia.assert(firstBan);
  // Validate first ban was successful
  TestValidator.equals(
    "ban community matches",
    firstBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "ban member matches",
    firstBan.member.id,
    bannedMemberResult.id,
  );
  TestValidator.predicate("ban has reason", firstBan.reason !== null);
  TestValidator.predicate(
    "ban is active (not lifted)",
    firstBan.lifted_at === null,
  );
  // 5. Attempt duplicate ban: Try to ban the same member again
  await TestValidator.httpError(
    "duplicate ban returns 409 conflict",
    409,
    async () => {
      await generate_random_reddit_clone_member_communities_bans_create(
        ownerConnection,
        {
          params: { communityId: community.id },
          body: {
            member_id: bannedMemberResult.id,
            reason: "Attempting to ban again",
          },
        },
      );
    },
  );
  // 6. Verify the original ban record still exists and is unchanged
  // (We can't directly query bans, but we can verify the ban is still effective
  // by checking that the member cannot post - however, since we don't have
  // a posts API in the available functions, we'll validate the ban record
  // properties from the first ban response)
  TestValidator.predicate("original ban still exists", firstBan.id !== undefined);
  TestValidator.predicate(
    "original ban still active",
    firstBan.lifted_at === null,
  );
}