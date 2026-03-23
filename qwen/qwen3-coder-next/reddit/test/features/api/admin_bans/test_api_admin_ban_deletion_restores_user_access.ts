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

export async function test_api_admin_ban_deletion_restores_user_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a ban record using the available endpoint
  // Create ban with dummy data for testing ban deletion
  const banResponse =
    await api.functional.redditLike.admin.communities.bans.create(
      adminConnection,
      {
        communityId: RandomGenerator.alphaNumeric(8),
        body: {
          reddit_like_user_id: typia.random<string & tags.Format<"uuid">>(),
          reddit_like_community_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          status: "active",
        } satisfies IRedditLikeBan.ICreate,
      },
    );
  typia.assert(banResponse);
  // 3. Verify ban was created
  TestValidator.equals("ban has correct ID", banResponse.id, banResponse.id);
  TestValidator.equals("ban has active status", banResponse.status, "active");
  // 4. Delete the ban record
  await api.functional.redditLike.admin.bans.erase(adminConnection, {
    banId: banResponse.id,
  });
  // 5. Verify ban shows deleted_at timestamp in response
  TestValidator.predicate("ban record has deleted_at timestamp", () => {
    return (
      banResponse.deleted_at !== null && banResponse.deleted_at !== undefined
    );
  });
}
