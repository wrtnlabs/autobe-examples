import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityIcon";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_icon_retrieval_nonexistent_community(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not correspond to any existing community
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the icon using this non-existent communityId
  // Expect 404 Not Found error
  await TestValidator.httpError(
    "should return 404 for non-existent community",
    404,
    async () => {
      await api.functional.communityPlatform.communities.icon.at(connection, {
        communityId: nonExistentCommunityId,
      });
    },
  );
}
