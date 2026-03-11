import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_admin_communities_bans_create } from "../../../generate/generate_random_reddit_like_admin_communities_bans_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_ban } from "../../../prepare/prepare_random_reddit_like_ban";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_admin_retrieve_community_ban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(adminUser);
  // 2. Create member user to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberUser = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(memberUser);
  // 3. Admin creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
      },
    },
  );
  typia.assert(community);
  // 4. Admin bans the member in the community
  const banned =
    await generate_random_reddit_like_admin_communities_bans_create(
      adminConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          reddit_like_user_id: memberUser.id,
          reddit_like_community_id: community.id,
          status: "active",
        },
      },
    );
  typia.assert(banned);
  // 5. Admin retrieves the ban details
  const retrieved = await api.functional.redditLike.admin.bans.at(
    adminConnection,
    {
      banId: banned.id,
    },
  );
  typia.assert(retrieved);
  // 6. Validate retrieved ban includes correct banned user and community information
  TestValidator.equals("banned user matches", retrieved.id, banned.id);
  TestValidator.equals(
    "banned user ID matches",
    retrieved.reddit_like_user_id,
    memberUser.id,
  );
  TestValidator.equals(
    "community ID matches",
    retrieved.reddit_like_community_id,
    community.id,
  );
  TestValidator.equals("status is active", retrieved.status, "active");
  TestValidator.equals(
    "banned user info matches",
    retrieved.bannedUser.id,
    memberUser.id,
  );
  TestValidator.equals(
    "banned user username matches",
    retrieved.bannedUser.username,
    memberUser.username,
  );
  // Validate bannedCommunity information (using ISummary fields only)
  TestValidator.equals(
    "banned community name matches",
    retrieved.bannedCommunity.name,
    community.name,
  );
  TestValidator.equals(
    "banned community icon_url matches",
    retrieved.bannedCommunity.icon_url,
    community.icon_url,
  );
  TestValidator.predicate(
    "banned community subscriber_count is valid",
    () => typeof retrieved.bannedCommunity.subscriber_count === "number",
  );
}
