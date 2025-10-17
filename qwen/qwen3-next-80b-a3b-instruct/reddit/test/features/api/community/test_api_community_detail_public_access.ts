import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

export async function test_api_community_detail_public_access(
  connection: api.IConnection,
) {
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.at(connection, {
      communityId,
    });
  typia.assert(community);
}
