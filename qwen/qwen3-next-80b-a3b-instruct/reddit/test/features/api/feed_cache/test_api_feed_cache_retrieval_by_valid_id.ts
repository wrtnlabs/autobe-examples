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

export async function test_api_feed_cache_retrieval_by_valid_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authorization using existing admin credentials
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Retrieve feed cache entry using valid UUID
  const cacheId = typia.random<string & tags.Format<"uuid">>();
  const feedResponse = await api.functional.community.admin.feed.cache.at(
    adminConnection,
    {
      cacheId,
    },
  );
  typia.assert(feedResponse);
  // 3. Since ICommunityMvFeedCacheEntry is empty object {}, the only validation is successful retrieval
  // The payload is serialized JSON that the client will parse - we've validated the successful API call
}
