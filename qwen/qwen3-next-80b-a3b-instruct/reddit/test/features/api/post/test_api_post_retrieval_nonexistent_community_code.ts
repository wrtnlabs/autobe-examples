import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_retrieval_nonexistent_community_code(
  connection: api.IConnection,
) {
  // Generate a valid post code using random uuid
  const postCode: string = typia.random<string & tags.Format<"uuid">>();

  // Generate a completely random and likely non-existent community code
  const communityCode: string = typia.random<string>();

  // Attempt to retrieve the post with non-existent community code - should fail
  await TestValidator.error(
    "non-existent community code should return 404",
    async () => {
      await api.functional.communityPlatform.communities.posts.at(connection, {
        communityCode,
        postCode,
      });
    },
  );
}
