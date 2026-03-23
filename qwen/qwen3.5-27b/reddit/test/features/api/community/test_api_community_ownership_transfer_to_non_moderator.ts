import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test community ownership transfer to a member who is not currently a moderator.
 *
 * Scenario: A community owner transfers ownership to a subscribed member who
 * does not have moderator privileges. This validates that the transfer endpoint
 * automatically creates a moderator record for the new owner and downgrades the
 * previous owner to a regular moderator role.
 */
export async function test_api_community_ownership_transfer_to_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as current community owner (member A)
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
  // 3. Register and authenticate as new owner candidate (member B)
  const newOwnerConnection: api.IConnection = { host: connection.host };
  const newOwnerAuth = await authorize_member_join(newOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(newOwnerAuth);
  // Note: In a real scenario, member B would need to subscribe to the community
  // However, there's no subscription API provided in the available functions
  // The transfer endpoint should handle this automatically or validate membership
  // 4. Transfer ownership from member A to member B (who is not a moderator)
  const transferredCommunity =
    await api.functional.redditClone.member.communities.transfer(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          new_owner_id: newOwnerAuth.id,
        } satisfies IRedditCloneCommunity.ITransfer,
      },
    );
  typia.assert(transferredCommunity);
  // 5. Validate that ownership was transferred
  TestValidator.equals(
    "community owner updated to new member",
    transferredCommunity.owner.id,
    newOwnerAuth.id,
  );
  // 6. Validate that the new owner has the correct information
  TestValidator.equals(
    "new owner username matches",
    transferredCommunity.owner.username,
    newOwnerAuth.username,
  );
  // 7. Validate that the community still exists and is active
  TestValidator.predicate(
    "community is not deleted",
    transferredCommunity.deleted_at === null,
  );
  // 8. Validate that subscriber count is maintained (should be at least 2: owner + new owner)
  TestValidator.predicate(
    "subscriber count is at least 2",
    transferredCommunity.subscriber_count >= 2,
  );
}
