import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_unrestricted_community_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Verify admin can retrieve their subscribed communities list
  const myCommunities =
    await api.functional.redditLike.admin.communities.my.index(adminConnection);
  typia.assert(myCommunities);
  // 3. Validate response structure
  TestValidator.equals(
    "has pagination object",
    typeof myCommunities.pagination,
    "object",
  );
  TestValidator.predicate("has data array", Array.isArray(myCommunities.data));
  TestValidator.predicate(
    "data array has expected structure",
    myCommunities.data.length === 0 ||
      (typeof myCommunities.data[0].name === "string" &&
        (myCommunities.data[0].icon_url === null ||
          typeof myCommunities.data[0].icon_url === "string") &&
        typeof myCommunities.data[0].subscriber_count === "number"),
  );
}
