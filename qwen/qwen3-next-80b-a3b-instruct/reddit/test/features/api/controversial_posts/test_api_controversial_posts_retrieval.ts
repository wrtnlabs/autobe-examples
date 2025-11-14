import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_controversial_posts_retrieval(
  connection: api.IConnection,
) {
  const response: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.statistics.posts.controversial.index(
      connection,
    );
  typia.assert(response);
}
