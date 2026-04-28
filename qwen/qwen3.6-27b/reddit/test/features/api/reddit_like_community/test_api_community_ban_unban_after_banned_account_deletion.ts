import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_community_bans_create } from "../../../generate/generate_random_reddit_like_community_member_communities_community_bans_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_ban } from "../../../prepare/prepare_random_reddit_like_community_community_ban";

/**
 * Test that a ban record is automatically removed when the banned member deletes their account.
 *
 * Validates cascade deletion behavior of community bans when a banned member
 * permanently erases their account. The test verifies that when a member who has
 * been banned from a community, their account deletion triggers automatic
 * removal of their associated ban records. Attempting to manually erase (unban) a ban
 * record that was cascade-deleted should result in a 404 Not Found error,
 * confirming proper cascade deletion behavior is working.
 *
 * 1. Owner member registers and authenticates to gain community creation and moderation authority.
 * 1.1. Creates a new member account via authorization utility.
 * 2. Owner creates a community to establish the moderation context.
 * 2.1. Uses generation utility to create a randomized community.
 * 2.2. The owner becomes the community's moderator automatically.
 * 3. Second (banned target) member registers as a separate account.
 * 3.1. Creates a new member account that will be banned and then deleted.
 * 4. Owner bans the second member using their member ID.
 * 4.1. Creates a ban record linking the banned member to the community.
 * 5. Banned member deletes their own account, triggering cascade deletion.
 * 5.1. Uses the banned member's connection to call profile.erase endpoint.
 * 5.2. This operation cascade-deletes all associated records including the ban.
 * 6. Owner attempts to erase the now-nonexistent ban record.
 * 6.1. Tries to unban the deleted member's now-deleted ban record.
 * 6.2. Expects a 404 Not Found error because the ban record no longer exists.
 * 7. Success confirms cascade deletion of ban records on member account deletion.
 */
export async function test_api_community_ban_unban_after_banned_account_deletion(
  connection: api.IConnection,
) {
  // 1. Owner member registers and authenticates
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
    },
  });
  typia.assert(ownerAuthorized);
  // 2. Owner creates a community
  const community =
    await api.functional.redditLikeCommunity.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Second member registers (will be banned then deleted)
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuthorized = await authorize_member_join(
    bannedMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
      },
    },
  );
  typia.assert(bannedMemberAuthorized);
  // 4. Owner bans the second member
  const ban =
    await api.functional.redditLikeCommunity.member.communities.community_bans.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          member_id: bannedMemberAuthorized.id,
          reason: "Test ban for cascade deletion validation",
        } satisfies IREdditLikeCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 5. Banned member deletes their own account (cascade deletes the ban)
  await api.functional.redditLikeCommunity.member.profile.erase(
    bannedMemberConnection,
  );
  // 6. Owner attempts to erase the now-nonexistent ban record
  await TestValidator.error(
    "unban should fail with 404 after member account deletion",
    async () => {
      await api.functional.redditLikeCommunity.member.communities.community_bans.erase(
        ownerConnection,
        {
          communityId: community.id,
          communityBanId: ban.id,
        },
      );
    },
  );
}
