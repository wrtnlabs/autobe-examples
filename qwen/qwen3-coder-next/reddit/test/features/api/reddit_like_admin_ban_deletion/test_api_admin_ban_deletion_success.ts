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
import { generate_random_reddit_like_admin_communities_bans_create } from "../../../generate/generate_random_reddit_like_admin_communities_bans_create";
import { prepare_random_reddit_like_ban } from "../../../prepare/prepare_random_reddit_like_ban";

export async function test_api_admin_ban_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
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
  // Step 2: Create a ban with a randomly generated user and community
  const userId = typia.random<string & tags.Format<"uuid">>();
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create a ban for the user in the community
  const banResponse =
    await api.functional.redditLike.admin.communities.bans.create(
      adminConnection,
      {
        communityId,
        body: {
          reddit_like_user_id: userId,
          reddit_like_community_id: communityId,
          status: "active",
        } satisfies IRedditLikeBan.ICreate,
      },
    );
  typia.assert(banResponse);
  // Step 4: Delete the ban
  await api.functional.redditLike.admin.bans.erase(adminConnection, {
    banId: banResponse.id,
  });
  // Step 5: Verify ban is removed by attempting to create a new ban
  const newBanResponse =
    await api.functional.redditLike.admin.communities.bans.create(
      adminConnection,
      {
        communityId,
        body: {
          reddit_like_user_id: userId,
          reddit_like_community_id: communityId,
          status: "active",
        } satisfies IRedditLikeBan.ICreate,
      },
    );
  typia.assert(newBanResponse);
  // Step 6: Verify the new ban has a different ID
  TestValidator.notEquals(
    "new ban has different ID",
    newBanResponse.id,
    banResponse.id,
  );
}
