import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_tag_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID for the tag identifier
  const tagId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the tag by its unique identifier
  // This is a public endpoint - no authentication required per API specification
  const tag = await api.functional.discussionBoard.tags.at(connection, {
    tagId,
  });
  // Validate the response structure matches IDiscussionBoardTag type
  typia.assert(tag);
  // Validate business logic constraints
  // Active tags should have deleted_at as null
  TestValidator.predicate(
    "active tag has null deleted_at",
    tag.deleted_at === null,
  );
  // Validate that retrieved tag id matches the requested tagId
  TestValidator.equals("retrieved tag id matches requested id", tag.id, tagId);
}
