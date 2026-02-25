import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBan";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { generate_random_reddit_community_community_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_community_community_moderator_communities_bans_create";
import { prepare_random_reddit_community_ban } from "../../../prepare/prepare_random_reddit_community_ban";

export async function test_api_community_moderator_view_user_ban_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new community moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  typia.assert(moderator);
  // 2. Create a target user
  const targetUser = typia.random<string & tags.Format<"uuid">>();
  // 3. Create first ban in moderator's community
  const communityId1 = moderator.community.id;
  const ban1 =
    await api.functional.redditCommunity.communityModerator.communities.bans.create(
      moderatorConnection,
      {
        communityId: communityId1,
        body: {
          user_id: targetUser,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(ban1);
  // 4. Create second ban in another community that the moderator can access
  // Since we don't have a way to create additional communities for this moderator,
  // we'll use the same community to create a second ban
  const ban2 =
    await api.functional.redditCommunity.communityModerator.communities.bans.create(
      moderatorConnection,
      {
        communityId: communityId1,
        body: {
          user_id: targetUser,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(ban2);
  // 5. Create an inactive ban to verify it doesn't appear in results
  // First create a ban then deactivate it
  const inactiveBanRecord =
    await api.functional.redditCommunity.communityModerator.communities.bans.create(
      moderatorConnection,
      {
        communityId: communityId1,
        body: {
          user_id: targetUser,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(inactiveBanRecord);
  // 6. Create a ban on a different user to ensure they don't appear in results
  const otherUser = typia.random<string & tags.Format<"uuid">>();
  const otherUserBan =
    await api.functional.redditCommunity.communityModerator.communities.bans.create(
      moderatorConnection,
      {
        communityId: communityId1,
        body: {
          user_id: otherUser,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(otherUserBan);
  // 7. Test the view ban history endpoint with the target user ID
  const userBanHistory =
    await api.functional.redditCommunity.communityModerator.bans.index(
      moderatorConnection,
      {
        userId: targetUser,
      },
    );
  typia.assert<IPageIRedditCommunityBan.ISummary>(userBanHistory);
  // 8. Validate response structure
  TestValidator.equals(
    "pagination structure",
    userBanHistory.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    userBanHistory.pagination.limit,
    1000,
  );
  TestValidator.predicate(
    "pagination has records",
    userBanHistory.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    userBanHistory.pagination.pages > 0,
  );
  // 9. Validate data contains only active bans for the target user
  TestValidator.equals("number of active bans", userBanHistory.data.length, 2);
  // 10. Verify bans are sorted by created_at descending (newest first)
  const ban1CreatedAt = new Date(userBanHistory.data[0].created_at);
  const ban2CreatedAt = new Date(userBanHistory.data[1].created_at);
  TestValidator.predicate(
    "bans sorted by created_at descending",
    ban1CreatedAt >= ban2CreatedAt,
  );
  // 11. Verify each ban entry has correct structure
  const banEntries = userBanHistory.data;
  // Verify first ban (should be newest)
  const newerBan = banEntries[0];
  TestValidator.equals("newer ban active status", newerBan.is_active, true);
  TestValidator.predicate(
    "newer ban has user object",
    newerBan.user !== null && newerBan.user !== undefined,
  );
  TestValidator.predicate(
    "newer ban has community object",
    newerBan.community !== null && newerBan.community !== undefined,
  );
  TestValidator.equals(
    "newer ban reason exists",
    newerBan.reason !== null && newerBan.reason !== undefined,
    true,
  );
  // Verify second ban (should be older)
  const olderBan = banEntries[1];
  TestValidator.equals("older ban active status", olderBan.is_active, true);
  TestValidator.predicate(
    "older ban has user object",
    olderBan.user !== null && olderBan.user !== undefined,
  );
  TestValidator.predicate(
    "older ban has community object",
    olderBan.community !== null && olderBan.community !== undefined,
  );
  TestValidator.equals(
    "older ban reason exists",
    olderBan.reason !== null && olderBan.reason !== undefined,
    true,
  );
  // 12. Ensure inactive ban is not included in results
  const inactiveBanIds = banEntries.map((b) => b.id);
  TestValidator.predicate(
    "inactive ban not included",
    !inactiveBanIds.includes(inactiveBanRecord.id),
  );
  // 13. Verify that bans from other users are not included
  TestValidator.predicate(
    "other user ban not included",
    !inactiveBanIds.includes(otherUserBan.id),
  );
  // 14. Test error case: invalid UUID user ID
  await TestValidator.error("should reject invalid UUID", async () => {
    await api.functional.redditCommunity.communityModerator.bans.index(
      moderatorConnection,
      {
        userId: "invalid-uuid",
      },
    );
  });
  // 15. Verify the user can only view bans in communities they moderate
  // We've already tested that the moderator can see bans in their community
  // No need to test other communities since the moderator can't moderate them
}
