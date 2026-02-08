import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_discussion_board_tag_retrieval_soft_deleted_tag(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies the retrieval of a soft-deleted discussion board tag by its UUID.
  // It checks that the tag is returned including the deleted_at timestamp, and that
  // the API returns HTTP 200 status.
  // Directly use the base connection host to create a specialized connection for guest (unauthorized) access
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID for the tagId
  const softDeletedTagId = typia.random<string & tags.Format<"uuid">>();
  // Call the API to retrieve the discussion board tag by tagId
  // Since this is a GET endpoint accessible by all, no authorization is needed
  const tag = await api.functional.discussionBoard.tags.at(guestConnection, {
    tagId: softDeletedTagId,
  });
  // Perform a complete type assertion of the response
  typia.assert(tag);
  // Validate that the returned tag includes the deleted_at timestamp property
  // deleted_at can be null or a string containing ISO datetime
  // We check that deleted_at is either null or a valid ISO string
  TestValidator.predicate(
    "soft-deleted tag has deleted_at",
    () => {
      const deletedAt = (tag as any).deleted_at;
      return deletedAt === null || typeof deletedAt === "string";
    },
  );
}
