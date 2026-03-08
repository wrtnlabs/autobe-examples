import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that requesting a non-existent tag ID returns a 404 error.
 *
 * Verifies the system properly handles requests for tags that don't exist
 * by returning a 404 Not Found response.
 */
export async function test_api_tag_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not correspond to any tag in the system
  const nonExistentTagId = typia.random<string & tags.Format<"uuid">>();
  // Verify that requesting a non-existent tag returns 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent tag",
    404,
    async () => {
      await api.functional.discussionBoard.tags.at(connection, {
        tagId: nonExistentTagId,
      });
    },
  );
}
