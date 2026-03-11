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

export async function test_api_ban_status_update_to_inactive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Login as admin to update ban status
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IRedditLikeAdmin.ILogin,
  });
  // 2. Create a ban record using available function with mock IDs
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const userId = typia.random<string & tags.Format<"uuid">>();
  const ban = await generate_random_reddit_like_admin_communities_bans_create(
    adminConnection,
    {
      body: {
        reddit_like_user_id: userId,
        reddit_like_community_id: communityId,
        status: "active",
      } satisfies IRedditLikeBan.ICreate,
      params: {
        communityId: communityId,
      },
    },
  );
  typia.assert(ban);
  // Verify ban was created with active status
  TestValidator.equals("ban status is active", ban.status, "active");
  // Store original updated_at timestamp
  const originalUpdatedAt = ban.updated_at;
  // 3. Update the ban status to inactive
  const updateInput = {
    status: "inactive",
  } satisfies IRedditLikeBan.IUpdate;
  const updatedBan = await api.functional.redditLike.admin.bans.update(
    adminConnection,
    {
      banId: ban.id,
      body: updateInput,
    },
  );
  typia.assert(updatedBan);
  // 4. Verify the ban status changed to inactive and updated_at changed
  TestValidator.equals(
    "ban status updated to inactive",
    updatedBan.status,
    "inactive",
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedBan.updated_at,
    originalUpdatedAt,
  );
}
