import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_tag_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for the test (no authentication needed for public endpoint)
  const testConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID format that doesn't exist in the database
  const nonExistentTagId = typia.random<string & tags.Format<"uuid">>();
  // Test that requesting a non-existent tag returns 404 error
  await TestValidator.httpError(
    "non-existent tag returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.tags.at(testConnection, {
        tagId: nonExistentTagId,
      });
    },
  );
}
