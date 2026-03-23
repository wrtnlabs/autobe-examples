import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeBan";
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

export async function test_api_admin_ban_list_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await api.functional.redditLike.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatarUrl: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeAdmin.IJoin,
    },
  );
  typia.assert(adminResult);
  adminConnection.headers = { Authorization: adminResult.token.access };
  // Create an unauthenticated connection (no headers set)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Test 1: Admin can retrieve ban list
  const banList = await api.functional.redditLike.admin.communities.bans.index(
    adminConnection,
    {
      communityId: "test-community-id",
      body: {
        status: "active",
        page: 1,
        limit: 20,
      } satisfies IRedditLikeBan.IRequest,
    },
  );
  typia.assert(banList);
  // Test 2: Unauthenticated request is denied
  await TestValidator.error(
    "unauthorized access should be rejected",
    async () => {
      await api.functional.redditLike.admin.communities.bans.index(
        unauthorizedConnection,
        {
          communityId: "test-community-id",
          body: {
            status: "active",
            page: 1,
            limit: 20,
          } satisfies IRedditLikeBan.IRequest,
        },
      );
    },
  );
}
