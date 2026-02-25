import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTextContent";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_content_non_existent_post(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not exist
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve content for non-existent post and expect error
  await TestValidator.httpError(
    "should return error for non-existent post",
    [404, 400], // Accept either 404 (Not Found) or 400 (Bad Request)
    async () =>
      await api.functional.communityPlatform.posts.content(connection, {
        postId: nonExistentPostId,
      }),
  );
}
