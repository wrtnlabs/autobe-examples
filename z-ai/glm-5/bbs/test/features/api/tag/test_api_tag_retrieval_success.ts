import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test successful retrieval of an active tag by its unique identifier.
 *
 * Validates that the GET /discussionBoard/tags/{tagId} endpoint returns
 * proper tag data matching IDiscussionBoardTag structure. Tags are public
 * entities accessible without authentication.
 */
export async function test_api_tag_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random tag ID for testing
  const tagId = typia.random<string & tags.Format<"uuid">>();
  // Call the tag retrieval endpoint
  const tag: IDiscussionBoardTag = await api.functional.discussionBoard.tags.at(
    connection,
    {
      tagId,
    },
  );
  // Validate complete response structure
  typia.assert(tag);
}
