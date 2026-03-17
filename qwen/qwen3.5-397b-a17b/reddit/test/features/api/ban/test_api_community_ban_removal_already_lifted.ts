import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_communities_bans_create } from "../../../generate/generate_random_reddit_clone_member_communities_bans_create";
import { prepare_random_reddit_clone_ban } from "../../../prepare/prepare_random_reddit_clone_ban";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test the edge case where a moderator attempts to remove a ban that has already been lifted (soft-deleted).
 *
 * Test Steps:
 * 1. Authenticate as a member who will become the community owner/moderator
 * 2. Create a new community
 * 3. Authenticate as a different member who will be banned
 * 4. As the moderator, create a ban against the second member
 * 5. As the moderator, delete the ban (first deletion - should succeed)
 * 6. Attempt to delete the same ban again (second deletion - should fail with 404)
 *
 * Business Logic Validations:
 * - The system verifies the ban exists and is active (deleted_at is null) before allowing deletion
 * - Attempting to delete an already-deleted ban should return 404 Not Found
 * - The ban record maintains its deleted_at timestamp from the first deletion
 * - This prevents duplicate deletion operations and ensures data integrity
 *
 * Expected Outcome:
 * - First ban deletion succeeds with 204 response
 * - Second deletion attempt fails with 404 error indicating ban not found or already deleted
 * - Ban record preserves the original deleted_at timestamp
 */
export async function test_api_community_ban_removal_already_lifted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member who will own the community and act as moderator
  const moderatorAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderatorAuth);
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // 2. Create a community where the moderator has authority
  const community = await generate_random_reddit_clone_communities_create(
    moderatorConnection,
    {},
  );
  typia.assert(community);
  // 3. Authenticate as a different member who will be banned
  const bannedMemberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(bannedMemberAuth);
  // 4. As the moderator, create a ban against the second member
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    moderatorConnection,
    {
      params: { communityId: community.id },
      body: {
        member_id: bannedMemberAuth.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(ban);
  // 5. As the moderator, delete the ban (first deletion - should succeed)
  await api.functional.redditClone.member.communities.bans.erase(
    moderatorConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  // 6. Attempt to delete the same ban again (second deletion - should fail with 404)
  await TestValidator.error(
    "second deletion should fail with 404",
    async () => {
      await api.functional.redditClone.member.communities.bans.erase(
        moderatorConnection,
        {
          communityId: community.id,
          banId: ban.id,
        },
      );
    },
  );
}
