import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_retrieval_nonexistent_post_code(
  connection: api.IConnection,
) {
  const communityCode = typia.random<string>();
  const nonExistentPostCode = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "retrieving non-existent post should return 404",
    async () => {
      await api.functional.communityPlatform.communities.posts.at(connection, {
        communityCode,
        postCode: nonExistentPostCode,
      });
    },
  );
}
