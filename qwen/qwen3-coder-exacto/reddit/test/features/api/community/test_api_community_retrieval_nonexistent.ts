import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";

export async function test_api_community_retrieval_nonexistent(
  connection: api.IConnection,
) {
  // Generate a random community slug that should not exist
  const nonexistentSlug = RandomGenerator.alphabets(10);

  // Attempt to retrieve a non-existent community and expect an error
  await TestValidator.error(
    "should throw error when retrieving non-existent community",
    async () => {
      await api.functional.communityForum.communities.at(connection, {
        communitySlug: nonexistentSlug,
      });
    },
  );
}
