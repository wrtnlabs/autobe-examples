import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_bans_create } from "../../../generate/generate_random_community_member_communities_bans_create";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_ban } from "../../../prepare/prepare_random_community_ban";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

/**
 * Test extending a temporary ban by updating the expiration date.
 *
 * Setup:
 * 1. Authenticate as a member who will become the community owner
 * 2. Create a test community (member becomes owner with moderation privileges)
 * 3. Create another member who will be banned
 * 4. Create a temporary ban with initial expiration date (7 days from now)
 *
 * Execution:
 * 5. Update the ban with extended expiration date (30 days from now) and updated reason
 *
 * Validation:
 * - Verify expiredAt is updated to the new extended date
 * - Verify reason is updated to new text
 * - Verify updatedAt timestamp reflects the modification
 */
export async function test_api_ban_update_extend_duration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as owner/moderator member
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create a community (owner becomes moderator automatically)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Create a member to be banned
  const bannedConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedConnection, {});
  typia.assert(bannedMember);
  // 4. Create a temporary ban with initial expiration (7 days from now)
  const initialReason = RandomGenerator.paragraph({ sentences: 2 });
  const initialExpiredAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const initialBan =
    await generate_random_community_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: {
          username: bannedMember.username,
          reason: initialReason,
          expired_at: initialExpiredAt,
        } satisfies ICommunityBan.ICreate,
      },
    );
  typia.assert(initialBan);
  // 5. Update the ban - extend duration to 30 days and update reason
  const updatedReason = RandomGenerator.paragraph({ sentences: 3 });
  const updatedExpiredAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const updatedBan =
    await api.functional.community.member.communities.bans.update(
      ownerConnection,
      {
        communityName: community.name,
        banId: initialBan.id,
        body: {
          reason: updatedReason,
          expiredAt: updatedExpiredAt,
        } satisfies ICommunityBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // 6. Validate the ban was updated correctly
  // Verify ban ID remains the same
  TestValidator.equals("ban ID unchanged", updatedBan.id, initialBan.id);
  // Verify reason was updated
  TestValidator.equals("reason updated", updatedBan.reason, updatedReason);
  // Verify expiredAt was extended
  TestValidator.equals(
    "expiration date extended",
    updatedBan.expiredAt,
    updatedExpiredAt,
  );
  // Verify updatedAt is more recent than createdAt
  TestValidator.predicate(
    "updatedAt is recent",
    new Date(updatedBan.updatedAt).getTime() >
      new Date(initialBan.createdAt).getTime() - 1000,
  );
  // Verify member and community references are preserved
  TestValidator.equals(
    "banned member unchanged",
    updatedBan.member.id,
    bannedMember.id,
  );
  TestValidator.equals(
    "community unchanged",
    updatedBan.community.id,
    community.id,
  );
}
