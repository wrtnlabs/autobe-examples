import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityMvFeedCacheEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMvFeedCacheEntry";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_feed_cache_retrieval_by_invalid_id(
  connection: api.IConnection,
): Promise<void> {
  // Admin user attempts to retrieve a feed response using a cacheId that does not exist in the system. The system returns HTTP 404 with no payload, confirming that the endpoint properly handles non-existent cache entries as specified. This validates the system's behavior for handling invalid or expired cache references, which helps prevent erroneous client-side rendering.
  // 1. Authenticate admin user using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // 2. Attempt to retrieve non-existent cache entry with a valid UUID
  // We generate a random UUID that is guaranteed to not exist in the system
  const nonExistentCacheId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify that fetching a non-existent cacheId returns HTTP 404
  await TestValidator.httpError(
    "fetch non-existent cacheId should return 404",
    404,
    async () => {
      await api.functional.community.admin.feed.cache.at(adminConnection, {
        cacheId: nonExistentCacheId,
      });
    },
  );
}
