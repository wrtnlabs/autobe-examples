import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_discussion_board_tag_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that requesting a non-existent discussion board tag returns a 404 error.
  // Use base connection to create a dedicated connection for guest (no login required).
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID that does not exist.
  const nonExistentTagId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the tag by this non-existent ID.
  // Expect an HTTP 404 error with an informative message.
  await TestValidator.httpError(
    "tag retrieval returns 404 for non-existent tag",
    404,
    async () => {
      await api.functional.discussionBoard.tags.at(guestConnection, {
        tagId: nonExistentTagId,
      });
    },
  );
}
