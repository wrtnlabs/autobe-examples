import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

export async function test_api_community_retrieval_archived(
  connection: api.IConnection,
) {
  const nonExistentCommunityCode = typia.random<
    string & tags.Pattern<"^[a-z0-9_-]{3,50}$">
  >();

  // The community code is randomly generated and will not exist in the system
  // We expect a 404 Not Found error when retrieving a non-existent community code
  await TestValidator.error(
    "non-existent community code should return 404 Not Found",
    async () => {
      await api.functional.communityPlatform.communities.at(connection, {
        communityCode: nonExistentCommunityCode,
      });
    },
  );
}
