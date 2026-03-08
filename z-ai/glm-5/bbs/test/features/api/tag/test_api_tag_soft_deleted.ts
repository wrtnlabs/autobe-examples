import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_tag_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Generate a UUID that does not correspond to any existing tag
  // This simulates accessing a soft-deleted tag (which would also return 404)
  const nonExistentTagId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to fetch the tag - should return 404 for both:
  // 1. Non-existent tags
  // 2. Soft-deleted tags (deleted_at IS NOT NULL)
  await TestValidator.httpError(
    "soft-deleted or non-existent tag should return 404",
    404,
    async () =>
      await api.functional.discussionBoard.tags.at(connection, {
        tagId: nonExistentTagId,
      }),
  );
}
