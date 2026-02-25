import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieval of a non-existent ban record.
 *
 * This test validates that the system properly handles requests for
 * non-existent ban records by returning a 404 NOT_FOUND error.
 * A randomly generated UUID (which does not correspond to any existing
 * ban record) is used to simulate a lookup for a non-existent resource.
 */
export async function test_api_ban_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not exist in the system
  const nonExistentBanId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve a ban record that doesn't exist
  // Expect a 404 NOT_FOUND error
  await TestValidator.httpError(
    "should return 404 for non-existent ban",
    404,
    async () =>
      await api.functional.discussionBoard.bans.at(connection, {
        banId: nonExistentBanId,
      }),
  );
}
