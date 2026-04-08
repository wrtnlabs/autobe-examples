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
 * Test ban reason update workflow while preserving ban status.
 *
 * Validates the complete ban management flow including member authentication, community creation, ban creation with initial reason, and ban update with modified reason while keeping status unchanged. Ensures that the ban update endpoint correctly supports partial updates to the reason field without affecting other ban properties.
 *
 * Special attention is given to verifying that the status field remains 'active' after the reason update, and that the updated_at timestamp reflects the modification time. This validates the audit trail capability for moderation actions.
 *
 * 1. Member registers and authenticates to become community owner.
 * 2. Creates a new community where ban management will occur.
 * 3. Creates a ban record with initial reason 'Spam violations' and active status.
 * 4. Updates the ban by changing only the reason field to 'Updated: Repeated spam violations after warning'.
 * 5. Validates the updated ban contains the new reason value.
 * 6. Validates the status remains 'active' (unchanged from original).
 * 7. Validates the updated_at timestamp is newer than created_at timestamp.
 */
export async function test_api_ban_update_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member who will own the community
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create a ban with initial reason
  const ban =
    await generate_random_reddit_community_member_communities_bans_create(
      memberConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          reddit_community_member_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          reason: "Spam violations",
          status: "active",
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 4. Update the ban reason only (status unchanged)
  const updatedBan =
    await api.functional.redditCommunity.member.communities.bans.update(
      memberConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          reason: "Updated: Repeated spam violations after warning",
        } satisfies IRedditCommunityBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // 5. Validate the updated reason
  TestValidator.equals(
    "reason updated",
    updatedBan.reason,
    "Updated: Repeated spam violations after warning",
  );
  // 6. Validate status remains active (unchanged)
  TestValidator.equals("status unchanged", updatedBan.status, "active");
  // 7. Validate updated_at is newer than created_at
  TestValidator.predicate("updated_at newer than created_at", () => {
    return (
      new Date(updatedBan.updated_at).getTime() >
      new Date(updatedBan.created_at).getTime()
    );
  });
  // 8. Validate other fields remain unchanged
  TestValidator.equals(
    "community unchanged",
    updatedBan.community.id,
    community.id,
  );
  TestValidator.equals("ban id unchanged", updatedBan.id, ban.id);
}
