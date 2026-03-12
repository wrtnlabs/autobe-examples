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
 * Test that community ownership transfer is rejected when the new owner candidate is banned.
 *
 * Scenario: A community owner attempts to transfer ownership to a member who has been banned
 * from the community. The transfer should be rejected because banned users cannot become
 * community owners.
 *
 * Steps:
 * 1. Register and authenticate as the current community owner (member A)
 * 2. Create a new community as member A
 * 3. Register and authenticate as the banned member candidate (member B)
 * 4. As member A, ban member B from the community
 * 5. As member A, attempt to call the transfer endpoint with member B's ID as new_owner_id
 * 6. Verify the transfer is rejected with appropriate error response
 */
export async function test_api_community_ownership_transfer_rejected_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as the current community owner (member A)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create a new community as member A
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Register and authenticate as the banned member candidate (member B)
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(bannedMemberAuth);
  // 4. As member A, ban member B from the community
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    ownerConnection,
    {
      params: {
        communityId: community.id,
      },
      body: {
        member_id: bannedMemberAuth.id,
        reason: "Test ban for ownership transfer rejection",
      },
    },
  );
  typia.assert(ban);
  // 5. As member A, attempt to transfer ownership to the banned member B
  // This should fail because banned users cannot become community owners
  await TestValidator.error(
    "transfer rejected when new owner is banned",
    async () => {
      await api.functional.redditClone.member.communities.transfer(
        ownerConnection,
        {
          communityId: community.id,
          body: {
            new_owner_id: bannedMemberAuth.id,
          } satisfies IRedditCloneCommunity.ITransfer,
        },
      );
    },
  );
}
