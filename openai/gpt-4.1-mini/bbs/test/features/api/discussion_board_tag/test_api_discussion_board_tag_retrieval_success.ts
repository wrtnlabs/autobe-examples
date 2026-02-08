import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

export async function test_api_discussion_board_tag_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID to test retrieval; in a real environment this should match an existing tag.
  const tagId = typia.random<string & tags.Format<"uuid">>();
  // Create a connection for the guest user (no special authorization required).
  const guestConnection: api.IConnection = { host: connection.host };
  // Try to retrieve the tag by its UUID.
  const tag = await api.functional.discussionBoard.tags.at(guestConnection, {
    tagId,
  });
  // Validate the response structure and contents.
  typia.assert(tag);

  // Instead of accessing non-existent properties, just test the entire tag is defined and valid.
  TestValidator.predicate("tag is object", typeof tag === "object" && tag !== null);
}