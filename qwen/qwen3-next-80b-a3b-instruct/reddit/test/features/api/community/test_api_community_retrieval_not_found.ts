import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

export async function test_api_community_retrieval_not_found(
  connection: api.IConnection,
) {
  // Test retrieval of non-existent community code
  // We cannot create communities as the API only provides retrieval (at) endpoint
  // But we can verify that non-existent community codes return 404 Not Found
  const nonExistentCode: string = `non-existent-community-${RandomGenerator.alphaNumeric(15)}`;
  await TestValidator.error(
    "non-existent community code should return 404 Not Found",
    async () => {
      await api.functional.communityPlatform.communities.at(connection, {
        communityCode: nonExistentCode,
      });
    },
  );
}
