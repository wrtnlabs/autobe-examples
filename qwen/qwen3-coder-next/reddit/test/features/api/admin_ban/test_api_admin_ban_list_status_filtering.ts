import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeBan";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_reddit_like_admin_communities_bans_create } from "../../../generate/generate_random_reddit_like_admin_communities_bans_create";
import { prepare_random_reddit_like_ban } from "../../../prepare/prepare_random_reddit_like_ban";

export async function test_api_admin_ban_list_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin session
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. List communities to get a valid community ID
  const communities = await api.functional.redditLike.communities.index(
    adminConnection,
    {
      body: { page: 1, limit: 100 } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(communities);
  const communityId = communities.data[0]?.name;
  if (!communityId) {
    throw new Error("No communities available for testing");
  }
  // 3. Get admin's member ID (admin should also be a member)
  // Since we can't directly create members, we'll use the admin's ID
  // In a real system, admins would also have member profiles
  const adminMemberId = admin.id;
  // 4. Create an active ban for testing
  const activeBan =
    await api.functional.redditLike.admin.communities.bans.create(
      adminConnection,
      {
        communityId,
        body: {
          reddit_like_user_id: adminMemberId,
          reddit_like_community_id: communityId,
          status: "active",
        } satisfies IRedditLikeBan.ICreate,
      },
    );
  typia.assert(activeBan);
  // 5. Create an inactive ban for testing status filtering
  const inactiveBan =
    await api.functional.redditLike.admin.communities.bans.create(
      adminConnection,
      {
        communityId,
        body: {
          reddit_like_user_id: adminMemberId,
          reddit_like_community_id: communityId,
          status: "inactive",
        } satisfies IRedditLikeBan.ICreate,
      },
    );
  typia.assert(inactiveBan);
  // 6. Test filtering by active status
  const activeBans =
    await api.functional.redditLike.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          status: "active",
          page: 1,
          limit: 100,
        } satisfies IRedditLikeBan.IRequest,
      },
    );
  typia.assert(activeBans);
  // 7. Verify only active bans are returned
  TestValidator.equals("active bans count", activeBans.data.length, 1);
  TestValidator.equals(
    "active ban status",
    activeBans.data[0].status,
    "active",
  );
  TestValidator.equals(
    "active ban user matches",
    activeBans.data[0].bannedUser.id,
    adminMemberId,
  );
  // 8. Test filtering by inactive status
  const inactiveBans =
    await api.functional.redditLike.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          status: "inactive",
          page: 1,
          limit: 100,
        } satisfies IRedditLikeBan.IRequest,
      },
    );
  typia.assert(inactiveBans);
  // 9. Verify only inactive bans are returned
  TestValidator.equals("inactive bans count", inactiveBans.data.length, 1);
  TestValidator.equals(
    "inactive ban status",
    inactiveBans.data[0].status,
    "inactive",
  );
  TestValidator.equals(
    "inactive ban user matches",
    inactiveBans.data[0].bannedUser.id,
    adminMemberId,
  );
  // 10. Test fetching all bans without status filter
  const allBans = await api.functional.redditLike.admin.communities.bans.index(
    adminConnection,
    {
      communityId,
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditLikeBan.IRequest,
    },
  );
  typia.assert(allBans);
  // 11. Verify all bans are returned when no filter is applied
  TestValidator.equals("all bans count", allBans.data.length, 2);
  // 12. Verify banned user information is correctly populated
  TestValidator.equals(
    "banned user matches",
    allBans.data[0].bannedUser.id,
    adminMemberId,
  );
  TestValidator.equals(
    "banned community matches",
    allBans.data[0].bannedCommunity.name,
    communityId,
  );
  // 13. Verify ban details
  TestValidator.equals("first ban is active", allBans.data[0].status, "active");
  TestValidator.equals(
    "second ban is inactive",
    allBans.data[1].status,
    "inactive",
  );
}
