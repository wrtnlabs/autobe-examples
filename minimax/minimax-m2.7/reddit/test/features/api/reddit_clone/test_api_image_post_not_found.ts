import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_image_post_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't exist in the system
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve image for non-existent post
  // Should return 404 Not Found error
  await TestValidator.httpError(
    "non-existent post image returns 404",
    404,
    async () => {
      await api.functional.redditClone.posts.image.at(connection, {
        postId: nonExistentPostId,
      });
    },
  );
}
