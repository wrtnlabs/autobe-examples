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
 * Test the edge case where a moderator reactivates a previously removed ban.
 *
 * Validates the business logic that when a ban record exists with status 'removed', creating a new ban against the same member should update the existing record's status to 'active' rather than creating a duplicate ban record.
 *
 * 1. Authenticate as member A (community owner) via join - creates the first member account who will own the community and manage bans.
 * 2. Create a new community owned by member A - establishes the community where ban management will be tested.
 * 3. Authenticate as member B via join - creates the second member account who will be the target of the ban.
 * 4. As member A, create a ban against member B with status 'removed' - creates an inactive ban record to simulate a previously removed ban.
 * 5. As member A, create another ban request against the same member B with status 'active' - attempts to ban the same member again, which should trigger the reactivation logic.
 * 6. Validate the ban reactivation behavior: verify the existing ban record is updated to 'active' status, the updated_at timestamp changes from the original creation, and no duplicate ban record is created.
 */
export async function test_api_community_ban_reactivate_removed_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member A (community owner)
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
  // 2. Create a new community owned by member A
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Authenticate as member B (the member to be banned)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberBAuth);
  // 4. As member A, create a ban against member B with status 'removed'
  const initialBan =
    await generate_random_reddit_community_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          reddit_community_member_id: memberBAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          status: "removed",
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(initialBan);
  TestValidator.equals("initial ban status", initialBan.status, "removed");
  TestValidator.equals(
    "initial ban member",
    initialBan.member.id,
    memberBAuth.id,
  );
  TestValidator.equals(
    "initial ban community",
    initialBan.community.id,
    community.id,
  );
  // 5. As member A, create another ban request against the same member B with status 'active'
  // This should reactivate the existing ban record rather than creating a duplicate
  const newBanReason = RandomGenerator.paragraph({ sentences: 1 });
  const reactivatedBan =
    await generate_random_reddit_community_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          reddit_community_member_id: memberBAuth.id,
          reason: newBanReason,
          status: "active",
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(reactivatedBan);
  // 6. Validate the ban reactivation behavior
  // The ban ID should be the same (existing record updated, not new record created)
  TestValidator.equals(
    "ban ID unchanged (same record)",
    reactivatedBan.id,
    initialBan.id,
  );
  // Status should be updated to 'active'
  TestValidator.equals(
    "ban status reactivated",
    reactivatedBan.status,
    "active",
  );
  // The updated_at timestamp should be later than or equal to created_at
  TestValidator.predicate("updated_at is after created_at", () => {
    return (
      new Date(reactivatedBan.updated_at).getTime() >=
      new Date(reactivatedBan.created_at).getTime()
    );
  });
  // Verify the reason was updated to the new reason
  TestValidator.equals(
    "ban reason updated",
    reactivatedBan.reason,
    newBanReason,
  );
  // Member and community should remain the same
  TestValidator.equals(
    "banned member unchanged",
    reactivatedBan.member.id,
    memberBAuth.id,
  );
  TestValidator.equals(
    "community unchanged",
    reactivatedBan.community.id,
    community.id,
  );
}
